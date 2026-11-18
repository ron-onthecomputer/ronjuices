import { Router } from "express";
import type { ProductRepository } from "../products/product.types.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { validateCartSchema } from "./cart.schemas.js";
import { validateCart } from "./cart.service.js";

export function createCartRouter(repository: ProductRepository): Router {
  const router = Router();

  router.post(
    "/validate",
    asyncHandler(async (request, response) => {
      const body = validateCartSchema.parse(request.body);
      const result = await validateCart(repository, body.items);
      response.json({ success: true, data: result });
    }),
  );

  return router;
}
