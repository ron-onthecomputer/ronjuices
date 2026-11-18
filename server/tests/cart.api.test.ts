import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { availableProduct, FakeProductRepository } from "./helpers/product-repository.js";

const app = createApp({
  productRepository: new FakeProductRepository(),
  clientOrigin: "http://localhost:3000",
});

describe("cart validation API", () => {
  it("calculates totals from repository prices", async () => {
    const response = await request(app)
      .post("/api/v1/cart/validate")
      .send({ items: [{ productId: availableProduct.id, quantity: 2, priceCents: 1 }] })
      .expect(200);

    expect(response.body.data).toMatchObject({
      subtotalCents: 1400,
      currency: "USD",
      issue: null,
      isValid: true,
    });
  });

  it("flags quantities above current stock and excludes them from totals", async () => {
    const response = await request(app)
      .post("/api/v1/cart/validate")
      .send({ items: [{ productId: availableProduct.id, quantity: 4 }] })
      .expect(200);

    expect(response.body.data.items[0]).toMatchObject({
      issue: "INSUFFICIENT_STOCK",
      allowedQuantity: 3,
      lineTotalCents: 0,
    });
    expect(response.body.data.isValid).toBe(false);
  });

  it("does not total products with different currencies", async () => {
    const zwgProduct = {
      ...availableProduct,
      id: "22222222-2222-4222-8222-222222222222",
      slug: "zwg-product",
      currency: "ZWG" as const,
    };
    const mixedCurrencyApp = createApp({
      productRepository: new FakeProductRepository([availableProduct, zwgProduct]),
      clientOrigin: "http://localhost:3000",
    });

    const response = await request(mixedCurrencyApp)
      .post("/api/v1/cart/validate")
      .send({
        items: [
          { productId: availableProduct.id, quantity: 1 },
          { productId: zwgProduct.id, quantity: 1 },
        ],
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      subtotalCents: 0,
      currency: null,
      issue: "MIXED_CURRENCY",
      isValid: false,
    });
  });

  it("returns a ZWG total when every product is priced in ZWG", async () => {
    const zwgProduct = {
      ...availableProduct,
      currency: "ZWG" as const,
    };
    const zwgApp = createApp({
      productRepository: new FakeProductRepository([zwgProduct]),
      clientOrigin: "http://localhost:3000",
    });

    const response = await request(zwgApp)
      .post("/api/v1/cart/validate")
      .send({ items: [{ productId: zwgProduct.id, quantity: 2 }] })
      .expect(200);

    expect(response.body.data).toMatchObject({
      subtotalCents: 1400,
      currency: "ZWG",
      issue: null,
      isValid: true,
    });
  });
});
