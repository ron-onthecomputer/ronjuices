import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createCartRouter } from "./modules/cart/cart.routes.js";
import { createProductRepository } from "./modules/products/product.repository.js";
import { createProductRouter } from "./modules/products/product.routes.js";
import type { ProductRepository } from "./modules/products/product.types.js";
import { createOrderRouter } from "./modules/orders/order.routes.js";
import { createOrderService } from "./modules/orders/order.service.js";
import type { OrderService } from "./modules/orders/order.types.js";
import { createPaymentRouter } from "./modules/payments/payment.routes.js";
import { createPaymentService } from "./modules/payments/payment.service.js";
import type { PaymentService } from "./modules/payments/payment.types.js";
import { createPaynowGateway } from "./modules/payments/paynow.gateway.js";
import type { Currency } from "./modules/products/product.types.js";
import { createAdminRouter } from "./modules/admin/admin.routes.js";
import type { ProductImageStorage } from "./modules/products/product-image.storage.js";
import { requestContext } from "./middleware/request-context.js";
import { getPool } from "./db/pool.js";
import { ApiError } from "./utils/api-error.js";
import { asyncHandler } from "./utils/async-handler.js";

export type AppDependencies = {
  productRepository?: ProductRepository;
  orderService?: OrderService;
  paymentService?: PaymentService;
  clientOrigin?: string;
  imageStorage?: ProductImageStorage;
};

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const productRepository =
    dependencies.productRepository ?? createProductRepository();
  const clientOrigin = dependencies.clientOrigin ?? getEnv().CLIENT_ORIGIN;
  const orderService = dependencies.orderService ?? {
    create: (...args: Parameters<OrderService["create"]>) =>
      createOrderService().create(...args),
    findByOrderNumber: (
      ...args: Parameters<OrderService["findByOrderNumber"]>
    ) => createOrderService().findByOrderNumber(...args),
  };
  const defaultPaymentService = (): PaymentService => {
    const env = getEnv();
    const acceptedCurrencies = env.PAYNOW_ACCEPTED_CURRENCIES.split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((value): value is Currency => value === "USD" || value === "ZWG");
    return createPaymentService(
      createPaynowGateway({
        integrationId: env.PAYNOW_INTEGRATION_ID,
        integrationKey: env.PAYNOW_INTEGRATION_KEY,
        resultUrl: env.PAYNOW_RESULT_URL,
        returnUrl: env.PAYNOW_RETURN_URL,
        acceptedCurrencies,
      }),
    );
  };
  const paymentService = dependencies.paymentService ?? {
    initiate: (...args: Parameters<PaymentService["initiate"]>) =>
      defaultPaymentService().initiate(...args),
    reconcileById: (...args: Parameters<PaymentService["reconcileById"]>) =>
      defaultPaymentService().reconcileById(...args),
    reconcileByReference: (
      ...args: Parameters<PaymentService["reconcileByReference"]>
    ) => defaultPaymentService().reconcileByReference(...args),
    cancel: (...args: Parameters<PaymentService["cancel"]>) =>
      defaultPaymentService().cancel(...args),
  };

  app.disable("x-powered-by");
  if (getEnv().TRUST_PROXY) app.set("trust proxy", 1);
  app.use(requestContext);
  app.use(helmet());
  const allowedOrigins = clientOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin))
          return callback(null, true);
        callback(
          new ApiError(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed"),
        );
      },
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Request-Id"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.get("/api/v1/health", (_request, response) => {
    response.json({ success: true, data: { status: "ok" } });
  });
  app.get(
    "/api/v1/ready",
    asyncHandler(async (_request, response) => {
      await getPool().query("SELECT 1");
      response.json({ success: true, data: { status: "ready" } });
    }),
  );
  app.use("/api/v1/products", createProductRouter(productRepository));
  app.use("/api/v1/cart", createCartRouter(productRepository));
  app.use("/api/v1/orders", createOrderRouter(orderService));
  app.use("/api/v1/payments", createPaymentRouter(paymentService));
  app.use("/api/v1/admin", createAdminRouter(productRepository, dependencies.imageStorage));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
