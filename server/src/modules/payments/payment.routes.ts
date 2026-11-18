import express, { Router } from "express";
import { ApiError } from "../../utils/api-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { initiatePaymentSchema, paymentIdSchema, paynowResultSchema } from "./payment.schemas.js";
import type { PaymentService } from "./payment.types.js";

export function createPaymentRouter(service: PaymentService): Router {
  const router = Router();
  router.post("/paynow/initiate", asyncHandler(async (request, response) => {
    const input = initiatePaymentSchema.parse(request.body);
    const key = request.get("Idempotency-Key")?.trim() || input.idempotencyKey;
    if (!key || key.length < 8 || key.length > 200) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Provide an Idempotency-Key header of 8 to 200 characters");
    response.status(201).json({ success: true, data: await service.initiate(input.orderId, key) });
  }));
  router.post("/paynow/result", express.urlencoded({ extended: false, limit: "16kb" }), asyncHandler(async (request, response) => {
    const input = paynowResultSchema.parse(request.body);
    const payment = await service.reconcileByReference(input.reference);
    if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    response.type("text/plain").send("OK");
  }));
  router.get("/:paymentId/status", asyncHandler(async (request, response) => {
    const id = paymentIdSchema.parse(request.params.paymentId);
    response.json({ success: true, data: await service.reconcileById(id) });
  }));
  router.post("/:paymentId/cancel", asyncHandler(async (request, response) => {
    const id = paymentIdSchema.parse(request.params.paymentId);
    response.json({ success: true, data: await service.cancel(id) });
  }));
  return router;
}
