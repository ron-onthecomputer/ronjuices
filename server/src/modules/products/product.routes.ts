import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { ApiError } from "../../utils/api-error.js";
import { productListQuerySchema, productSlugSchema } from "./product.schemas.js";
import type { ProductRepository } from "./product.types.js";

export function createProductRouter(repository: ProductRepository): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const query = productListQuerySchema.parse(request.query);
      const result = await repository.list(query);
      response.json({
        success: true,
        data: result.products,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize),
        },
      });
    }),
  );

  router.get(
    "/:slug",
    asyncHandler(async (request, response) => {
      const slug = productSlugSchema.parse(request.params.slug);
      const product = await repository.findBySlug(slug);
      if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
      response.json({ success: true, data: product });
    }),
  );

  return router;
}
