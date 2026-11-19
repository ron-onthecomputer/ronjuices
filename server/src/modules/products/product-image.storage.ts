import { randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp, { type Metadata } from "sharp";
import { getEnv } from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import type { ProductImage } from "./product.types.js";

type GeneratedAsset = { key: string; body: Buffer; contentType: string; cacheControl: string };

export interface ProductImageStorage {
  uploadPng(source: Buffer, alt: string): Promise<ProductImage>;
}

const outputWidths = [400, 800] as const;

export function createR2ProductImageStorage(): ProductImageStorage {
  const env = getEnv();
  const configured = [env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY,
    env.R2_BUCKET_NAME, env.R2_PUBLIC_URL].every((value) => value.trim());

  if (!configured) {
    return { async uploadPng() {
      throw new ApiError(503, "IMAGE_STORAGE_NOT_CONFIGURED", "Product image storage is not configured");
    } };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  const publicBaseUrl = env.R2_PUBLIC_URL.replace(/\/$/, "");

  return {
    async uploadPng(source, alt) {
      let metadata: Metadata;
      try {
        metadata = await sharp(source, { limitInputPixels: 40_000_000 }).metadata();
      } catch {
        throw new ApiError(400, "INVALID_PRODUCT_IMAGE", "The uploaded file is not a valid PNG image");
      }
      if (metadata.format !== "png") throw new ApiError(415, "PNG_REQUIRED", "Product images must be PNG files");
      if (!metadata.width || !metadata.height) {
        throw new ApiError(400, "INVALID_PRODUCT_IMAGE", "The PNG dimensions could not be read");
      }

      const prefix = `products/${randomUUID()}/product`;
      const fallback = await sharp(source, { limitInputPixels: 40_000_000 }).rotate()
        .resize({ width: 800 }).png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer({ resolveWithObject: true });
      const responsiveAssets = await Promise.all(outputWidths.flatMap((width) => {
        const image = sharp(source, { limitInputPixels: 40_000_000 }).rotate().resize({ width });
        return [
          image.clone().webp({ quality: 82 }).toBuffer().then((body) => ({
            key: `${prefix}-${width}.webp`, body, contentType: "image/webp",
            cacheControl: "public, max-age=31536000, immutable",
          })),
          image.clone().avif({ quality: 55 }).toBuffer().then((body) => ({
            key: `${prefix}-${width}.avif`, body, contentType: "image/avif",
            cacheControl: "public, max-age=31536000, immutable",
          })),
        ];
      }));
      const assets: GeneratedAsset[] = [{
        key: `${prefix}-800.png`, body: fallback.data, contentType: "image/png",
        cacheControl: "public, max-age=31536000, immutable",
      }, ...responsiveAssets];

      try {
        await Promise.all(assets.map((asset) => client.send(new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME, Key: asset.key, Body: asset.body,
          ContentType: asset.contentType, CacheControl: asset.cacheControl,
        }))));
      } catch (error) {
        await client.send(new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME,
          Delete: { Objects: assets.map(({ key }) => ({ Key: key })) },
        })).catch(() => undefined);
        throw new ApiError(502, "IMAGE_UPLOAD_FAILED", "The product image could not be uploaded", {
          cause: error instanceof Error ? error.name : "unknown",
        });
      }

      return {
        alt,
        fallbackSrc: `${publicBaseUrl}/${prefix}-800.png`,
        webpSrc: `${publicBaseUrl}/${prefix}-800.webp`,
        avifSrc: `${publicBaseUrl}/${prefix}-800.avif`,
        width: fallback.info.width,
        height: fallback.info.height,
      };
    },
  };
}
