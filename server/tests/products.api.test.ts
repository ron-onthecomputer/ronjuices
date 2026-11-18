import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { availableProduct, FakeProductRepository } from "./helpers/product-repository.js";

const app = createApp({
  productRepository: new FakeProductRepository(),
  clientOrigin: "http://localhost:3000",
});

describe("product API", () => {
  it("returns products with server-owned price and availability", async () => {
    const response = await request(app).get("/api/v1/products").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      id: availableProduct.id,
      priceCents: 700,
      stockQuantity: 3,
      isAvailable: true,
    });
  });

  it("validates list query values", async () => {
    const response = await request(app).get("/api/v1/products?page=0").expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a safe not-found response", async () => {
    const response = await request(app).get("/api/v1/products/missing").expect(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });
});
