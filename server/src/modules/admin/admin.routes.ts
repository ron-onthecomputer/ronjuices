import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { getEnv } from "../../config/env.js";
import { getPool } from "../../db/pool.js";
import { ApiError } from "../../utils/api-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  productIdSchema,
  productPatchSchema,
  productWriteSchema,
} from "../products/product.schemas.js";
import type { ProductRepository } from "../products/product.types.js";
import type { ProductWriteInput } from "../products/product.types.js";
import { createProductImageStorage, type ProductImageStorage } from "../products/product-image.storage.js";
import {
  adminCookieName,
  createAdminSession,
  hashPassword,
  requireAdmin,
  verifyPassword,
} from "./admin.auth.js";
import { adminCredentials } from "./admin.credentials.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(500),
});
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(12, "New password must be at least 12 characters").max(500),
});
const orderQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(40).optional(),
});
const orderStatus = z.enum([
  "paid",
  "processing",
  "ready",
  "completed",
  "cancelled",
]);
const transitions: Record<string, string[]> = {
  paid: ["processing", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["completed"],
};

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export function createAdminRouter(
  products: ProductRepository,
  imageStorage: ProductImageStorage = createProductImageStorage(),
): Router {
  const router = Router();
  router.post(
    "/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    asyncHandler(async (request, response) => {
      const input = loginSchema.parse(request.body);
      const credentials = await getPool().query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_accounts WHERE email = $1",
        [adminCredentials.email],
      );
      const passwordHash = credentials.rows[0]?.password_hash;
      const valid =
        input.email.toLowerCase() === adminCredentials.email.toLowerCase() &&
        passwordHash !== undefined &&
        verifyPassword(input.password, passwordHash);
      if (!valid)
        throw new ApiError(
          401,
          "INVALID_ADMIN_CREDENTIALS",
          "Invalid email or password",
        );
      response.cookie(
        adminCookieName,
        createAdminSession(adminCredentials.email),
        {
          httpOnly: true,
          secure: getEnv().NODE_ENV === "production",
          sameSite: "strict",
          path: "/api/v1/admin",
          maxAge: 8 * 60 * 60 * 1000,
        },
      );
      response.json({ success: true, data: { email: adminCredentials.email } });
    }),
  );
  router.post("/auth/logout", (_request, response) => {
    response.clearCookie(adminCookieName, { path: "/api/v1/admin" });
    response.json({ success: true });
  });
  router.get("/auth/me", requireAdmin, (_request, response) =>
    response.json({ success: true, data: { email: adminCredentials.email } }),
  );
  router.patch(
    "/auth/password",
    requireAdmin,
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    asyncHandler(async (request, response) => {
      const input = passwordChangeSchema.parse(request.body);
      const credentials = await getPool().query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_accounts WHERE email = $1",
        [adminCredentials.email],
      );
      const currentHash = credentials.rows[0]?.password_hash;
      if (!currentHash || !verifyPassword(input.currentPassword, currentHash)) {
        throw new ApiError(
          401,
          "INVALID_CURRENT_PASSWORD",
          "Current password is incorrect",
        );
      }
      if (verifyPassword(input.newPassword, currentHash)) {
        throw new ApiError(
          400,
          "PASSWORD_UNCHANGED",
          "New password must be different from the current password",
        );
      }
      await getPool().query(
        "UPDATE admin_accounts SET password_hash = $2, updated_at = NOW() WHERE email = $1",
        [adminCredentials.email, hashPassword(input.newPassword)],
      );

      response.clearCookie(adminCookieName, { path: "/api/v1/admin" });
      response.json({ success: true });
    }),
  );

  router.use(requireAdmin);
  router.get(
    "/products",
    asyncHandler(async (_request, response) =>
      response.json({ success: true, data: await products.adminList() }),
    ),
  );
  router.post(
    "/product-images",
    productImageUpload.single("image"),
    asyncHandler(async (request, response) => {
      if (!request.file) throw new ApiError(400, "IMAGE_REQUIRED", "Select a PNG image to upload");
      const alt = z.string().trim().min(1).max(200).parse(request.body.alt);
      const image = await imageStorage.uploadPng(request.file.buffer, alt);
      response.status(201).json({ success: true, data: image });
    }),
  );
  router.post(
    "/products",
    asyncHandler(async (request, response) =>
      response
        .status(201)
        .json({
          success: true,
          data: await products.create(productWriteSchema.parse(request.body)),
        }),
    ),
  );
  router.patch(
    "/products/:id",
    asyncHandler(async (request, response) => {
      const product = await products.update(
        productIdSchema.parse(request.params.id),
        productPatchSchema.parse(request.body) as Partial<ProductWriteInput>,
      );
      if (!product)
        throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
      response.json({ success: true, data: product });
    }),
  );
  router.delete(
    "/products/:id",
    asyncHandler(async (request, response) => {
      const result = await products.delete(
        productIdSchema.parse(request.params.id),
      );
      if (result === "not_found")
        throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
      if (result === "in_use") {
        throw new ApiError(
          409,
          "PRODUCT_IN_USE",
          "This product belongs to an existing order and cannot be deleted",
        );
      }
      response.status(204).send();
    }),
  );
  router.get(
    "/orders",
    asyncHandler(async (request, response) => {
      const query = orderQuery.parse(request.query);
      const values: string[] = [];
      const conditions: string[] = [];
      if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(
          `(order_number ILIKE $${values.length} OR customer_email ILIKE $${values.length})`,
        );
      }
      if (query.status) {
        values.push(query.status);
        conditions.push(`status = $${values.length}`);
      }
      const result = await getPool().query(
        `SELECT id, order_number AS "orderNumber", customer_email AS "customerEmail", status,
       payment_status AS "paymentStatus", total_cents AS "totalCents", currency, created_at AS "createdAt"
       FROM orders ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`,
        values,
      );
      response.json({ success: true, data: result.rows });
    }),
  );
  router.patch(
    "/orders/:id/status",
    asyncHandler(async (request, response) => {
      const id = z.string().uuid().parse(request.params.id);
      const nextStatus = orderStatus.parse(request.body?.status);
      const current = await getPool().query<{ status: string }>(
        "SELECT status FROM orders WHERE id=$1",
        [id],
      );
      if (!current.rows[0])
        throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
      if (!(transitions[current.rows[0].status] ?? []).includes(nextStatus))
        throw new ApiError(
          409,
          "INVALID_ORDER_TRANSITION",
          `Cannot move ${current.rows[0].status} order to ${nextStatus}`,
        );
      await getPool().query("UPDATE orders SET status=$2 WHERE id=$1", [
        id,
        nextStatus,
      ]);
      response.json({ success: true, data: { id, status: nextStatus } });
    }),
  );
  router.get(
    "/payments",
    asyncHandler(async (_request, response) => {
      const result = await getPool()
        .query(`SELECT p.id, o.order_number AS "orderNumber", p.status, p.amount_cents AS "amountCents",
      p.currency, p.gateway_status AS "gatewayStatus", p.failure_reason AS "failureReason", p.attempts, p.created_at AS "createdAt"
      FROM payments p JOIN orders o ON o.id=p.order_id ORDER BY p.created_at DESC LIMIT 200`);
      response.json({ success: true, data: result.rows });
    }),
  );
  return router;
}
