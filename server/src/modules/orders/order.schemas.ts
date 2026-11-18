import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

export const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  customer: z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    firstName: text(100),
    lastName: text(100),
    phone: text(40),
  }),
  deliveryAddress: z.object({
    recipientName: text(200),
    line1: text(200),
    line2: z.string().trim().max(200).optional(),
    suburb: text(100),
    city: text(100),
    province: text(100),
    postalCode: text(20),
    country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  }),
  customerNote: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50).refine(
    (items) => new Set(items.map((item) => item.productId)).size === items.length,
    { message: "Each product may only appear once" },
  ),
});

export const orderNumberSchema = z.string().trim().min(1).max(40);
export const orderLookupEmailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
