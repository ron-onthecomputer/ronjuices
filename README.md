# RonJuices

RonJuices is a full-stack ecommerce experience for a premium juice brand. It is a storefront with live inventory, checkout and payment handling, order tracking, and a protected operations dashboard.

**Live site:** [ronjuices.vercel.app](https://ronjuices.vercel.app)

## What it includes

- Responsive product-led storefront with GSAP motion and custom interactions
- Live product catalogue, availability, pricing, and stock levels
- Persistent cart with inventory revalidation
- Customer checkout and Paynow payment flow
- Order lookup and payment-return handling
- Protected admin sign-in and password changes
- Admin product creation, editing, deletion, and stock management
- PNG upload with generated PNG, WebP, and AVIF variants
- PostgreSQL migrations and repeatable catalogue seeds
- Request validation, rate limiting, security headers, and structured API errors

## Architecture

```text
Browser
   |
   v
Vercel (React + Vite)
   |
   | /api/* rewrite
   v
Render (Express + TypeScript)
   |-- Neon PostgreSQL       products, orders, payments, admin credentials
   |-- Cloudflare R2         generated product images
   `-- Paynow                payment initiation and reconciliation
```

The frontend and backend live in one repository. Vite serves the React application locally and proxies `/api` to the Express server. In production, Vercel performs the same proxying through `vercel.json`.

## Technology

| Area         | Stack                                                |
| ------------ | ---------------------------------------------------- |
| Frontend     | React 18, Vite, React Router, Tailwind CSS, Flowbite |
| Motion       | GSAP, ScrollTrigger, React Fast Marquee              |
| Client state | Zustand, Axios                                       |
| Backend      | Node.js 20+, Express 5, TypeScript, Zod              |
| Database     | PostgreSQL, node-postgres                            |
| Payments     | Paynow                                               |
| Images       | Sharp, Cloudflare R2                                 |
| Testing      | Vitest, Supertest                                    |
| Hosting      | Vercel, Render, Neon, Cloudflare R2                  |

## Repository layout

```text
ronjuices/
|-- public/                     static storefront assets
|-- scripts/                    image optimisation utilities
|-- src/
|   |-- api/                    browser API client
|   |-- components/             storefront components
|   |-- contexts/               shared product catalogue
|   |-- data/                   static content
|   |-- hooks/                  catalogue hooks
|   |-- pages/                  checkout, orders, payments, and admin
|   |-- stores/                 persisted cart state
|   `-- styles/                 global styles and fonts
|-- server/
|   |-- src/
|   |   |-- config/             validated environment configuration
|   |   |-- db/                 pool, migrations, and seeds
|   |   |-- middleware/         request context and error handling
|   |   |-- modules/            admin, cart, orders, payments, products
|   |   `-- scripts/            admin password hashing
|   `-- tests/                  API and service tests
|-- vercel.json                 API proxy and SPA routing
`-- vite.config.js              local frontend configuration
```

## Local development

### Requirements

- Node.js 20 or newer
- npm
- PostgreSQL
- Paynow credentials for payment testing
- Cloudflare R2 credentials only when testing admin image uploads

### 1. Clone and install

```powershell
git clone https://github.com/ron-onthecomputer/ronjuices.git
cd ronjuices
npm.cmd install
npm.cmd --prefix server install
```

### 2. Create environment files

```powershell
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
```

Frontend variables:

| Variable               | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `VITE_API_URL`         | API base path; normally `/api/v1`          |
| `VITE_USD_TO_ZWG_RATE` | Display conversion rate used by the client |

Backend variables:

| Variable                     | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `NODE_ENV`                   | `development`, `test`, or `production`               |
| `PORT`                       | Local API port; defaults to `4000`                   |
| `DATABASE_URL`               | PostgreSQL connection string                         |
| `CLIENT_ORIGIN`              | Allowed frontend origin; comma-separated when needed |
| `TRUST_PROXY`                | Set to `true` behind Render or another trusted proxy |
| `PAYNOW_INTEGRATION_ID`      | Paynow merchant integration ID                       |
| `PAYNOW_INTEGRATION_KEY`     | Paynow merchant integration key                      |
| `PAYNOW_RESULT_URL`          | Public backend callback URL                          |
| `PAYNOW_RETURN_URL`          | Frontend payment-return URL                          |
| `PAYNOW_ACCEPTED_CURRENCIES` | Enabled currencies, such as `USD`                    |
| `ADMIN_SESSION_SECRET`       | Unique secret of at least 32 characters              |
| `R2_ACCOUNT_ID`              | Cloudflare account ID                                |
| `R2_ACCESS_KEY_ID`           | R2 API access key                                    |
| `R2_SECRET_ACCESS_KEY`       | R2 API secret                                        |
| `R2_BUCKET_NAME`             | Product image bucket                                 |
| `R2_PUBLIC_URL`              | HTTPS public bucket or custom-domain URL             |

Never expose backend secrets through a `VITE_` variable or commit either `.env` file.

### 3. Prepare the database

Create the database referenced by `server/.env`, then run:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

Migrations are tracked by filename and checksum. Once a migration has been applied, add a new numbered migration instead of editing the existing file.

The seed is repeatable and inserts or updates the initial catalogue without resetting stock quantities.

### 4. Start both applications

Terminal one:

```powershell
npm.cmd run dev:server
```

Terminal two:

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). The Vite development server forwards `/api` requests to [http://localhost:4000](http://localhost:4000).

## Admin access

The admin identity is developer-managed and there is no public registration flow. The initial account is inserted by the admin migration.

Generate a secure password hash before applying that migration to a new database:

```powershell
npm.cmd --prefix server run admin:hash -- "a-password-of-at-least-12-characters"
```

Store only the generated `scrypt:` hash. After signing in, the admin can change the password from the dashboard; the replacement hash is stored in PostgreSQL.

The admin dashboard is available at `/admin` and supports:

- Product and inventory management
- Optimised product-image uploads
- Order search and fulfilment transitions
- Recent payment visibility
- Password rotation and sign-out

## Product images

The storefront's original catalogue images live in `public/`. Image storage is selected automatically by the runtime environment:

- In development, generated assets are written to `public/images/uploads/` and served by Vite.
- In production, generated assets are uploaded to Cloudflare R2 when all `R2_*` variables are configured.

For each upload:

1. The admin uploads one PNG of up to 10 MB.
2. The API validates and rotates it with Sharp.
3. It generates responsive PNG, WebP, and AVIF assets.
4. The assets are stored locally during development or in R2 during production.
5. Their public URLs are saved with the product in PostgreSQL.

Development uploads are ignored by Git. All five `R2_*` variables must be configured together for production uploads. When none are set in production, the application still runs, but admin image uploads return a configuration error.

## Payments and orders

Checkout creates an order before initiating Paynow. Creation and payment initiation use idempotency keys to prevent duplicate operations.

Paynow result notifications are not accepted as proof of payment. The backend reconciles the payment using the poll URL received during initiation before updating payment, order, and inventory state.

Important routes include:

```text
GET    /api/v1/products
POST   /api/v1/cart/validate
POST   /api/v1/orders
GET    /api/v1/orders/:orderNumber
POST   /api/v1/payments/paynow/initiate
POST   /api/v1/payments/paynow/result
GET    /api/v1/payments/:paymentId/status
POST   /api/v1/payments/:paymentId/cancel
GET    /api/v1/health
GET    /api/v1/ready
```

Admin routes under `/api/v1/admin` require the signed HTTP-only admin session cookie.

## Useful commands

| Command                   | Description                       |
| ------------------------- | --------------------------------- |
| `npm run dev`             | Start the Vite frontend           |
| `npm run dev:server`      | Start the API in watch mode       |
| `npm run build`           | Build the production frontend     |
| `npm run build:server`    | Compile the TypeScript API        |
| `npm run lint`            | Lint frontend source files        |
| `npm run test:server`     | Run server tests                  |
| `npm run db:migrate`      | Apply pending database migrations |
| `npm run db:seed`         | Insert or update seed products    |
| `npm run images:optimize` | Generate optimised local images   |

Additional server commands can be run with `npm --prefix server run <script>`.

## Verification

Run the main checks before pushing:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix server run typecheck
npm.cmd --prefix server test
```

## Deployment

The current production layout uses:

- **Vercel** for the Vite frontend
- **Render** for the Express API
- **Neon** for persistent PostgreSQL storage
- **Cloudflare R2** for persistent generated images

`vercel.json` forwards `/api/*` to Render and sends remaining paths to `index.html` for React Router. Replace its Render destination if the API hostname changes.

Render should use:

```text
Root directory: server
Build command:  npm ci --include=dev && npm run db:migrate && npm run build
Start command:  npm start
Health check:   /api/v1/ready
```

All production backend variables belong in Render. Only public `VITE_*` variables belong in Vercel.

## Security notes

- Admin sessions use signed, HTTP-only cookies.
- Passwords are stored as salted scrypt hashes, never plaintext.
- Request bodies and query parameters are validated with Zod.
- API routes use security headers and rate limits.
- Payment state is reconciled server-side.
- Secrets are excluded through `.gitignore` and must be configured by the hosting provider.

## Author

Designed and developed by **Ron**.

The project package metadata declares the code under the MIT license.
