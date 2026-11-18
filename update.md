# RonJuices Full-Stack Upgrade Plan

> Implementation is split into three context-sized documents:
> [Part 1: backend foundation and catalogue](docs/upgrade-part-1-foundation-catalogue.md),
> [Part 2: orders and Paynow Zimbabwe](docs/upgrade-part-2-orders-paynow.md), and
> [Part 3: storefront, admin, and production readiness](docs/upgrade-part-3-storefront-admin-production.md).
> This original document remains the complete source plan.

## Goal

Convert the current React showcase into a complete PERN storefront with a JSX frontend and a TypeScript backend where customers can:

- Browse available drinks and view product details.
- See loading feedback while product/can information is fetched.
- See whether a product is available or out of stock.
- Add available products to a persistent cart.
- Complete a delivery and contact-information checkout.
- Pay through Paynow Zimbabwe using a server-side integration.
- Receive an order confirmation and review an order's status.

The current branding, animations, and one-page marketing content should be retained where practical.

## Recommended Stack

### Frontend

- React + Vite using the existing JSX setup
- React Router for storefront routes
- Axios for API requests
- Zustand for cart state and persistence
- React Hook Form + Zod for checkout validation
- Tailwind CSS for styling

### Backend

- Node.js + Express + TypeScript
- PostgreSQL
- `node-postgres` (`pg`) with parameterized SQL queries and explicit transactions
- Plain SQL migration and seed files, run by a small TypeScript migration script
- Zod for request and environment validation
- Vitest or Jest + Supertest for automated tests

The backend owns the TypeScript domain types and Zod request schemas. The JSX frontend consumes documented JSON response shapes and may use JavaScript Zod schemas for runtime validation where useful. No ORM or generated ORM client is required.

## Suggested Project Structure

The repository should be reorganized into a small workspace:

```text
ronjuices/
  client/
    src/
      api/
      components/
      features/
        cart/
        checkout/
        orders/
        products/
      hooks/
      pages/
      routes/
      schemas/
  server/
    src/
      config/
      controllers/
      db/
        migrations/
        seeds/
        pool.ts
        migrate.ts
      middleware/
      modules/
        orders/
        payments/
        products/
      routes/
      services/
      app.ts
      server.ts
    tests/
  package.json
```

The existing frontend can be moved into `client/` while retaining its `.jsx` files. Only the Express backend uses `.ts` files.

## Language Boundary and Data Contracts

Do not rename the existing `.jsx` components to `.tsx`. Use clear prop names, PropTypes or JSDoc where additional editor assistance is useful, and runtime validation at important boundaries.

The backend TypeScript product type should resemble:

```ts
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  volumeMl: number;
  priceCents: number;
  currency: "USD" | "ZWG";
  image: ProductImage;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
};

export type ProductImage = {
  alt: string;
  fallbackSrc: string;
  webpSrc: string;
  avifSrc: string;
  width: number;
  height: number;
};

export type CartItem = {
  productId: string;
  quantity: number;
};
```

The API serializes this shape to JSON for the JSX frontend. Availability must be calculated from `isActive && stockQuantity > 0`. The client must not be trusted to provide authoritative prices or availability.

## PostgreSQL Access Without an ORM

Create one `pg.Pool` for the application and reuse it rather than opening a connection for every request.

```ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

Database rules:

- Use `$1`, `$2`, and other placeholders for every untrusted value.
- Keep SQL in repository/query modules instead of controllers.
- Use `pool.query()` for single statements.
- Use a checked-out client for transactions and always release it in `finally`.
- Run `BEGIN`, `COMMIT`, and `ROLLBACK` explicitly for orders, payments, and stock changes.
- Lock inventory rows with `SELECT ... FOR UPDATE` before final stock validation and decrementing.
- Keep numbered plain SQL migrations in source control, for example `001_initial_schema.sql`.
- Track executed migrations in a `schema_migrations` table.
- Never build sort clauses, column names, or filters directly from request strings; map allowed values to known SQL fragments.

## Database Design

### `products`

- `id` UUID primary key
- `slug` unique text
- `name`
- `description`
- `volume_ml`
- `price_cents` integer
- `currency` constrained to `USD` or `ZWG`, defaulting to `USD`
- `stock_quantity` non-negative integer
- `low_stock_threshold` non-negative integer
- `is_active` boolean
- `is_featured` boolean
- `accent_color`
- `background_color`
- `created_at`
- `updated_at`

### `product_images`

- `id` UUID primary key
- `product_id` foreign key
- `alt_text`
- `fallback_url`
- `webp_url`
- `avif_url`
- `width`
- `height`
- `sort_order`

### `customers`

- `id` UUID primary key
- `email`
- `first_name`
- `last_name`
- `phone`
- `created_at`

Guest checkout should be supported. An account should not be required to buy drinks.

### `addresses`

- `id` UUID primary key
- `customer_id` nullable foreign key
- `recipient_name`
- `line_1`
- `line_2` nullable
- `suburb`
- `city`
- `province`
- `postal_code`
- `country`

### `orders`

- `id` UUID primary key
- `order_number` unique, human-readable value
- `customer_id` nullable foreign key
- `customer_email`
- `status`
- `payment_status`
- `subtotal_cents`
- `delivery_cents`
- `discount_cents`
- `total_cents`
- `currency`
- `delivery_address` JSON snapshot
- `customer_note` nullable
- `created_at`
- `updated_at`

Suggested order states:

```text
pending -> awaiting_payment -> paid -> processing -> ready -> completed
                            \-> payment_failed
pending/awaiting_payment -> cancelled
```

### `order_items`

- `id` UUID primary key
- `order_id` foreign key
- `product_id` foreign key
- `product_name` snapshot
- `volume_ml` snapshot
- `unit_price_cents` snapshot
- `quantity`
- `line_total_cents`

Product data should be copied into order items so historical receipts do not change when a product is edited later.

### `payments`

- `id` UUID primary key
- `order_id` foreign key
- `gateway` set to `paynow`
- `gateway_reference` unique
- `status`
- `amount_cents`
- `currency`
- `poll_url` nullable
- `redirect_url` nullable
- `gateway_status` nullable
- `failure_reason` nullable
- `created_at`
- `updated_at`

Never collect or store a full card number, expiry value, CVV, or Paynow integration key in the browser. Customers enter payment details on Paynow's hosted flow. The backend stores only the gateway references and URLs needed to reconcile the transaction.

## API Requirements

All endpoints should live under `/api/v1` and return a consistent success/error shape.

### Products

```text
GET    /api/v1/products
GET    /api/v1/products/:slug
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:id
PATCH  /api/v1/admin/products/:id/stock
```

The public list should support optional search, availability, featured, pagination, and sort parameters.

### Cart validation

```text
POST /api/v1/cart/validate
```

This endpoint receives product IDs and quantities, then returns current names, prices, availability, allowed quantities, and recalculated totals. Call it before displaying the final checkout total and immediately before creating the order.

### Orders

```text
POST   /api/v1/orders
GET    /api/v1/orders/:orderNumber
GET    /api/v1/admin/orders
PATCH  /api/v1/admin/orders/:id/status
```

The server must:

1. Load all requested products from PostgreSQL.
2. Reject inactive or unavailable products.
3. Reject quantities greater than the available stock.
4. Calculate every line total, delivery charge, discount, and final total.
5. Create the order and its items in a database transaction.
6. Reserve stock or decrement it at the chosen point in the payment flow.

For a first version, decrement stock only after Paynow confirms a successful payment. Before decrementing, lock/recheck the affected product rows inside a transaction to avoid overselling.

### Paynow Zimbabwe payments

```text
POST /api/v1/payments/paynow/initiate
POST /api/v1/payments/paynow/result
GET  /api/v1/payments/:paymentId/status
POST /api/v1/payments/:paymentId/cancel
```

The initiate endpoint creates a unique merchant reference, sends the server-calculated order amount to Paynow, and stores the returned redirect and poll URLs. The result endpoint receives Paynow's server notification; the browser return URL is navigation only and must not be treated as proof of payment. Reconcile status through Paynow and make the paid transition idempotent so repeated notifications or polls cannot reduce stock or mark the order paid twice.

The storefront supports USD and Zimbabwe Gold (`ZWG`). Send the exact server-authoritative order currency and amount to Paynow; never silently combine or convert differently denominated cart lines. The payment adapter must reject a currency that the configured Paynow merchant profile does not accept.

## Product Fetching and Loaders

Replace the static product list in `src/data/products.js` with an Axios request managed by a reusable `useProducts` hook.

### Product-list behavior

- Display product-card skeletons during the initial fetch.
- Match skeleton dimensions to the real cards to avoid layout movement.
- Show an inline progress indicator for background refetches without replacing already visible products.
- Show a useful error state with a **Try again** button.
- Show an empty state when no active products match the filters.
- Keep existing product data visible during short refetches.
- Cancel obsolete Axios requests when the component unmounts or filter parameters change.
- Disable controls only when the action they depend on is unavailable.

Suggested query states:

```jsx
const { products, isLoading, isRefreshing, error, refetch } = useProducts();

if (isLoading) return <ProductGridSkeleton count={6} />;
if (error) return <ProductLoadError onRetry={refetch} />;
if (!products.length) return <EmptyProducts />;

return <ProductGrid products={products} isRefreshing={isRefreshing} />;
```

Use a separate small loader for:

- Adding an item to the cart
- Validating cart prices
- Creating an order
- Confirming a payment
- Loading an order confirmation

Buttons should retain their width while showing a spinner and loading label such as `Adding...` or `Processing payment...`.

## Out-of-Stock Product Cards

The complete card must visibly communicate that it is unavailable.

When `!product.isActive || product.stockQuantity <= 0`:

- Apply grayscale to the image and mute the entire card.
- Add a light gray overlay without making the content unreadable.
- Display a prominent `Out of stock` badge.
- Disable the add-to-cart button.
- Change the button label to `Unavailable`.
- Remove hover lift, hover color, and purchase cursor effects.
- Add `aria-disabled="true"` and an accessible availability message.
- Prevent the click handler from adding the item, even if invoked manually.

Example styling direction:

```tsx
const isOutOfStock = !product.isActive || product.stockQuantity <= 0;

<article
  className={cn(
    "relative transition",
    isOutOfStock
      ? "cursor-not-allowed bg-gray-200 text-gray-500 grayscale"
      : "hover:-translate-y-1 hover:shadow-xl"
  )}
  aria-label={`${product.name}: ${isOutOfStock ? "out of stock" : "available"}`}
>
  {isOutOfStock && (
    <div className="absolute inset-0 z-10 bg-gray-200/45" aria-hidden="true" />
  )}
  {/* Product content */}
</article>
```

Low stock should be shown separately, for example `Only 3 left`, when the quantity is greater than zero but at or below `lowStockThreshold`.

If a cart item becomes unavailable after being added:

- Keep it visible in the cart.
- Mark it as unavailable.
- Exclude it from checkout totals.
- Require the customer to remove it before continuing.

If the available quantity decreases, reduce or flag the cart quantity and explain the change before checkout.

## Cart Features

- Cart drawer on desktop and a full cart page on mobile.
- Add, remove, increment, and decrement item quantities.
- Prevent quantities below one or above available stock.
- Cart-count badge in the navigation.
- Persist guest cart state in `localStorage`.
- Restore and validate the cart when the application loads.
- Display item totals, subtotal, delivery, discounts, and final total.
- Provide an `Empty cart` confirmation.
- Show a free-delivery progress message if a threshold is used.
- Announce cart changes with an accessible `aria-live` region.
- Link each item back to its product details.

Cart storage should contain only product IDs and quantities. Current product details and prices should always come from the API.

## Checkout Features

- Guest checkout by default.
- Contact details and South African delivery-address fields.
- Optional order note.
- Delivery-method selection if collection/delivery will both be supported.
- Client and server validation with errors next to their fields.
- Final server-side cart validation before order creation.
- Order summary that remains visible on larger screens.
- Disable duplicate submission while the order is being created.
- Preserve non-sensitive form data if the payment attempt fails.
- Confirmation page with order number, products, totals, delivery details, and status.

All monetary values must be stored and calculated as integers in cents, then formatted with `Intl.NumberFormat`.

## Useful Functional Features

### Customer-facing

- Product search by name or flavour.
- Filters for available products, volume, and price.
- Sort by featured, price, and name.
- Featured and most-popular sections driven by database fields.
- Product detail modal or route with ingredients, nutrition, volume, and availability.
- Recently viewed products stored locally.
- Copyable/shareable product links.
- Discount-code field with server validation.
- Newsletter form with real validation and success/error feedback.
- Order lookup using order number plus customer email.
- Toast notifications for cart and checkout actions.
- Clear offline/network-error feedback.

### Admin-facing

- Protected admin sign-in.
- Create and edit products.
- Activate/deactivate products without deleting order history.
- Update prices and stock quantities.
- See low-stock warnings.
- View, search, and filter orders.
- Change fulfilment status.
- View Paynow payment status and failure reason.
- Basic dashboard totals such as orders, revenue, and low-stock products.

Authentication and a full admin dashboard can follow the initial customer checkout if a smaller first release is preferred.

## Image Optimization

The current `public/images` directory is approximately 35.54 MB. The largest files include:

- `blueberries.png`: approximately 12.28 MB
- `mint.png`: approximately 4.04 MB
- `strawberries.png`: approximately 3.32 MB
- `pineapple.png`: approximately 2.93 MB
- Several product images between approximately 1 MB and 2.3 MB

Required changes:

- Generate AVIF and WebP output from source images.
- Generate several responsive widths instead of serving one oversized image.
- Use `<picture>`, `srcSet`, and `sizes`.
- Add meaningful `alt`, `width`, and `height` attributes.
- Use `loading="lazy"` and `decoding="async"` below the fold.
- Keep the primary hero/LCP image eager and use `fetchPriority="high"` only for it.
- Do not render the hidden second product row until the user expands it, or lazy-load it near the viewport.
- Convert retailer logos to SVG where suitable.
- Remove images that are unused after the product database is introduced.
- Add an image-optimization script using Sharp so optimized files can be regenerated consistently.

Targets:

- Most product images: 100-250 KB each.
- Primary hero visual: preferably below 500 KB.
- No original multi-megabyte image should be delivered directly to a browser.

## Font Optimization

The repository currently contains 83 font files totalling approximately 4.08 MB, plus externally loaded Google Fonts and Bootstrap Icons.

Required changes:

- Keep WOFF2 files only for supported modern browsers.
- Use one variable body font instead of many separate weights.
- Keep no more than one or two display/accent fonts.
- Remove EOT, TTF, duplicate WOFF, and unused italic/static font files after verifying usage and licensing.
- Fix the Satoshi paths, which currently point to `/src/fonts/...` instead of `src/assets/fonts/...`.
- Make declared family names match the names used in CSS and Tailwind.
- Remove the externally requested Poppins weights if Poppins is not used.
- Request only required Montserrat styles/weights if it remains the body font.
- Replace Bootstrap Icons with inline SVG or a tree-shakeable icon package.
- Retain `font-display: swap`.
- Preload only the critical body/display WOFF2 file, not every font.

A simple font system could use:

- Satoshi variable WOFF2 for body and UI text.
- Askey for primary brand headlines.
- Bagerich for occasional section headings.
- A system monospace stack instead of Courier Prime.

## Reliability and Security

- Validate all request bodies, route parameters, and environment variables.
- Add security headers, CORS configuration, request-size limits, and API rate limiting.
- Use parameterized `pg` queries and allow-list any dynamic SQL identifiers.
- Never trust prices, totals, stock, payment status, or order status from the client.
- Use database transactions for order creation, payment success, and inventory changes.
- Add idempotency protection to order creation and payment confirmation.
- Log order/payment references without logging sensitive customer or payment fields.
- Return safe public errors while retaining detailed server logs.
- Add a centralized Express error handler and a not-found handler.
- Use secure, HTTP-only cookies if admin authentication is added.
- Provide `.env.example` files without real secrets.

## Accessibility and UX

- Ensure every action is keyboard accessible.
- Provide visible focus styles.
- Use actual buttons for actions and links for navigation.
- Add accessible names to icon-only buttons.
- Use `aria-live` for cart changes, errors, and payment results.
- Do not indicate stock status using color alone.
- Respect `prefers-reduced-motion` for GSAP and other continuous animations.
- Keep contrast sufficient when graying out unavailable products.
- Avoid the custom cursor on touch devices and allow normal cursor behavior for form controls.

## Testing

### Backend tests

- Products return accurate stock and prices.
- Inactive products cannot be purchased.
- Out-of-stock products cannot be ordered.
- Excess quantities are rejected.
- Client-supplied prices are ignored.
- Totals and delivery charges are calculated correctly.
- Successful payment changes the order to paid and updates stock once.
- Duplicate payment confirmation does not update stock twice.
- Failed payment preserves stock and the appropriate order state.
- Concurrent orders cannot oversell a product.

### Frontend tests

- Skeleton cards appear during product loading.
- Retry state appears after a failed product request.
- Out-of-stock cards are gray, labeled, and cannot be added.
- Low-stock messaging is displayed correctly.
- Cart quantity cannot exceed available stock.
- Cart persists across reloads and is revalidated.
- Checkout validation prevents incomplete submissions.
- Payment success, failure, cancellation, and retry flows work.
- Product and cart interactions work with keyboard navigation.

### End-to-end flow

```text
Browse products
-> add available drink
-> edit cart
-> enter checkout information
-> create pending order
-> complete Paynow payment
-> see confirmation
-> verify order and stock in admin view
```

## Delivery Phases

### Phase 1: Foundation and performance

- Move the current JSX app into `client/` and introduce a TypeScript `server/`.
- Configure TypeScript for the backend only.
- Keep the React components in JSX and replace static product data with API-backed data.
- Fix build warnings, font paths, and CSS import order.
- Optimize images and fonts.
- Add formatting, linting, environment validation, and test configuration.

### Phase 2: Product API and inventory UI

- Create the PostgreSQL schema and seed the current drinks.
- Build public product endpoints.
- Fetch products through a reusable Axios-based hook.
- Add skeleton loaders, error/empty states, and refetch behavior.
- Add prices, stock status, low-stock messaging, and disabled gray out-of-stock cards.
- Add product detail routing.

### Phase 3: Cart and checkout

- Build a persistent Zustand cart store and navigation badge.
- Add quantity controls and server-side cart validation.
- Build checkout form and delivery/totals logic.
- Create orders transactionally.

### Phase 4: Paynow payments and confirmation

- Initiate Paynow hosted payments and persist redirect/poll URLs.
- Add idempotent result handling and status reconciliation.
- Update inventory after successful payment.
- Build success, failure, cancellation, and retry screens.
- Add printable order confirmation and order lookup.

### Phase 5: Admin and production hardening

- Add admin authentication and product/order management.
- Add stock controls and low-stock alerts.
- Complete automated tests, accessibility checks, security controls, and deployment setup.

## Minimum Release Acceptance Criteria

The first usable full-stack release is complete when:

- Products are loaded from PostgreSQL through the Express API.
- Loading, error, and empty states are present.
- Each product has a server-owned price and stock quantity.
- Out-of-stock products are fully grayed out, clearly labeled, accessible, and impossible to add.
- The cart persists locally and is revalidated against the server.
- Customers can submit a validated guest checkout.
- The server calculates all totals and creates an order transactionally.
- Paynow success, failure, cancellation, and retry paths work.
- Successful payment updates the order and stock exactly once.
- Customers can view a confirmation using a human-readable order number.
- Images and fonts are optimized enough that multi-megabyte originals are not delivered to the browser.
- Critical product, cart, order, payment, and inventory behavior is covered by automated tests.


