import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
});

export const paymentIdSchema = z.string().uuid();

export const paynowResultSchema = z.object({
  reference: z.string().trim().min(1).max(200),
}).passthrough();
