import { Router } from "express";
import { ApiError } from "../../utils/api-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createOrderSchema, orderLookupEmailSchema, orderNumberSchema } from "./order.schemas.js";
import type { OrderService } from "./order.types.js";

export function createOrderRouter(service: OrderService): Router {
  const router = Router();
  router.post("/", asyncHandler(async (request, response) => {
    const input = createOrderSchema.parse(request.body);
    const headerKey = request.get("Idempotency-Key")?.trim();
    const key = headerKey || input.idempotencyKey;
    if (!key || key.length < 8 || key.length > 200) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Provide an Idempotency-Key header of 8 to 200 characters");
    }
    const order = await service.create(input, key);
    response.status(201).json({ success: true, data: order });
  }));
  router.get("/:orderNumber", asyncHandler(async (request, response) => {
    const value = orderNumberSchema.parse(request.params.orderNumber);
    const email = orderLookupEmailSchema.parse(request.query.email);
    const order = await service.findByOrderNumber(value, email);
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
    response.json({ success: true, data: order });
  }));
  return router;
}
