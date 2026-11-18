# RonJuices API

The backend is an Express 5 and TypeScript API backed by PostgreSQL.

```powershell
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Run `npm test` for repository-independent API tests and `npm run typecheck` for a strict TypeScript check.

## Orders and Paynow

Order creation and payment initiation require an `Idempotency-Key` header. Configure all
`PAYNOW_*` values in `.env`; `PAYNOW_ACCEPTED_CURRENCIES` must match the currencies enabled
for the merchant profile. Paynow result notifications only trigger a server-side poll of the
saved poll URL. They are never accepted as proof of payment.

```text
POST /api/v1/orders
GET  /api/v1/orders/:orderNumber
POST /api/v1/payments/paynow/initiate
POST /api/v1/payments/paynow/result
GET  /api/v1/payments/:paymentId/status
POST /api/v1/payments/:paymentId/cancel
```

