import { z } from "zod";

export const productListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  availability: z.enum(["available", "unavailable"]).optional(),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sort: z
    .enum(["featured", "price-asc", "price-desc", "name-asc", "name-desc"])
    .default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const productSlugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/);

const imageSchema = z.object({
  alt: z.string().trim().min(1).max(200),
  fallbackSrc: z.string().trim().min(1).max(500),
  webpSrc: z.string().trim().min(1).max(500),
  avifSrc: z.string().trim().min(1).max(500),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const productWriteSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  volumeMl: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.enum(["USD", "ZWG"]),
  image: imageSchema,
  stockQuantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  accentColor: z.string().trim().min(1).max(50),
  backgroundColor: z.string().trim().min(1).max(50),
});

export const productPatchSchema = productWriteSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one product field is required" },
);

export const productIdSchema = z.string().uuid();
