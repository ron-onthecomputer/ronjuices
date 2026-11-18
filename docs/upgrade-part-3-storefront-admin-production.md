# Upgrade Part 3: Storefront, Admin, and Production Readiness

## Storefront integration

- Load products from the Part 1 API through a reusable Axios hook.
- Add skeleton, retry, empty, background-refresh, low-stock, and out-of-stock states.
- Persist only product IDs and quantities in Zustand and revalidate on restore and checkout.
- Add guest checkout, order summary, Paynow redirect/return handling, order lookup, and confirmation.
- Preserve non-sensitive checkout fields when a payment attempt fails.

## Admin

- Secure admin sign-in using HTTP-only cookies.
- Product create/edit, activation, pricing, inventory controls, and low-stock warnings.
- Order search/filtering and controlled fulfilment transitions.
- Payment status and failure visibility without exposing gateway secrets.

## Performance and accessibility

- Generate responsive AVIF/WebP product assets and use `<picture>`, `srcSet`, dimensions, and appropriate lazy loading.
- Reduce fonts to required WOFF2 assets and remove duplicate external font requests.
- Fix CSS import order and remaining build/lint warnings.
- Add keyboard, focus, live-region, contrast, reduced-motion, and touch-device checks.

## Production hardening

- Restrictive production CORS and proxy configuration.
- Structured logs, request correlation, health/readiness checks, and safe error reporting.
- Backup and migration runbooks.
- Integration and end-to-end coverage for product, cart, checkout, Paynow, order, and admin paths.
- Deployment configuration with HTTPS URLs for Paynow result and return endpoints.

