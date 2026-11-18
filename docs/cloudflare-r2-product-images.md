# Cloudflare R2 product images

New product images are uploaded from the authenticated admin page as PNG files. The backend validates and optimizes the image, then writes these immutable objects to R2:

- `product-800.png` (fallback)
- `product-400.webp` and `product-800.webp`
- `product-400.avif` and `product-800.avif`

The generated URLs are saved in the existing `product_images` record when the product is created. Existing local product image URLs continue to work.

## R2 setup

1. Create an R2 bucket and an API token with Object Read & Write access scoped to that bucket.
2. Expose the bucket through an R2 custom domain (recommended) or an `r2.dev` development URL.
3. Add all five variables to `server/.env`:

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-token-access-key
R2_SECRET_ACCESS_KEY=your-r2-token-secret
R2_BUCKET_NAME=ronjuices-products
R2_PUBLIC_URL=https://images.example.com
```

`R2_PUBLIC_URL` must be HTTPS and must point to the public root of the configured bucket. Do not include a trailing slash.

The original upload is limited to 10 MB and 40 megapixels. Assets use content-address-independent UUID paths and a one-year immutable cache policy, so replacing an image cannot leave shoppers with a stale cached asset.
