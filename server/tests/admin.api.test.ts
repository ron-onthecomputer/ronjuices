import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { FakeProductRepository } from "./helpers/product-repository.js";
import { adminCookieName, createAdminSession } from "../src/modules/admin/admin.auth.js";

const app = createApp({ productRepository: new FakeProductRepository(), clientOrigin: "http://localhost:3000" });

describe("admin API", () => {
  it("protects admin inventory and payment data", async () => {
    const response = await request(app).get("/api/v1/admin/products").expect(401);
    expect(response.body.error.code).toBe("ADMIN_AUTH_REQUIRED");
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("returns a correlation header on public requests", async () => {
    const response = await request(app).get("/api/v1/health").set("X-Request-Id", "integration-test").expect(200);
    expect(response.headers["x-request-id"]).toBe("integration-test");
  });

  it("protects product image uploads", async () => {
    await request(app)
      .post("/api/v1/admin/product-images")
      .attach("image", Buffer.from("not-an-image"), { filename: "product.png", contentType: "image/png" })
      .field("alt", "Product")
      .expect(401);
  });

  it("accepts an authenticated PNG upload through the configured image storage", async () => {
    const expectedImage = {
      alt: "Cranberry juice can",
      fallbackSrc: "https://images.example.com/products/id/product-800.png",
      webpSrc: "https://images.example.com/products/id/product-800.webp",
      avifSrc: "https://images.example.com/products/id/product-800.avif",
      width: 800,
      height: 533,
    };
    const uploadApp = createApp({
      productRepository: new FakeProductRepository(),
      clientOrigin: "http://localhost:3000",
      imageStorage: { uploadPng: async (_source, alt) => ({ ...expectedImage, alt }) },
    });
    const session = createAdminSession("admin@knot.dev");

    const response = await request(uploadApp)
      .post("/api/v1/admin/product-images")
      .set("Cookie", `${adminCookieName}=${session}`)
      .attach("image", Buffer.from("fake-png-for-storage-adapter"), {
        filename: "product.png",
        contentType: "image/png",
      })
      .field("alt", expectedImage.alt)
      .expect(201);

    expect(response.body.data).toEqual(expectedImage);
  });
});
