# Upgrade Part 1: Backend Foundation and Catalogue

## Outcome

Part 1 introduces a TypeScript Express API and PostgreSQL catalogue while leaving the existing JSX storefront intact. It establishes the contracts that later order and payment work will use.

## Included

- TypeScript-only backend in `server/`.
- Validated environment configuration and a shared PostgreSQL pool.
- Numbered, checksum-protected SQL migrations and repeatable seed data.
- Product and product-image schema.
- Public product listing and detail endpoints with search, filters, sorting, and pagination.
- Server-authoritative cart validation using current price, activation, and stock values.
- Consistent success/error envelopes, CORS, security headers, body limits, and rate limiting.
- API tests that run without a live database by injecting a repository double.

## API

```text
GET  /api/v1/health
GET  /api/v1/products
GET  /api/v1/products/:slug
POST /api/v1/cart/validate
```

The list endpoint accepts `search`, `availability`, `featured`, `sort`, `page`, and `pageSize`. Allowed sort values are `featured`, `price-asc`, `price-desc`, `name-asc`, and `name-desc`.

Cart storage and requests contain only `productId` and `quantity`. Client-supplied prices are ignored. Invalid or unavailable lines remain visible in the validation response but contribute zero to the valid subtotal.

Product prices are denominated in either `USD` or `ZWG`; the current seed catalogue uses USD. Cart validation refuses to total mixed-currency lines. ZWG display conversion in the existing frontend remains separate from the authoritative stored price until the Part 2 order flow moves conversion policy to the server.

## Local setup

1. Copy `server/.env.example` to `server/.env` and update `DATABASE_URL`.
2. Run `npm install --prefix server`.
3. Run `npm run db:migrate` and `npm run db:seed` from the repository root.
4. Run `npm run dev:server`; the API listens on port 4000 by default.

## Deferred

Orders, stock locking/decrementing, Paynow, frontend API loading, admin routes, and image generation are deliberately deferred to Parts 2 and 3.

