# Production runbook

## Deploy

1. Provision PostgreSQL with encrypted storage and automated daily backups.
2. Set `NODE_ENV=production`, `DATABASE_URL`, the public HTTPS `CLIENT_ORIGIN`, a unique 32+ character `ADMIN_SESSION_SECRET`, and Paynow credentials. Admin login credentials live in `server/src/modules/admin/admin.credentials.ts`; store only a scrypt password hash there.
3. Set `PAYNOW_RESULT_URL=https://api.example.com/api/v1/payments/paynow/result` and `PAYNOW_RETURN_URL=https://shop.example.com/checkout/payment-return`. Production startup rejects non-HTTPS Paynow URLs.
4. Run `npm ci`, `npm --prefix server ci`, `npm run db:migrate`, `npm run build`, and `npm run build:server` as separate release steps. Run migrations once before shifting traffic.
5. Serve `dist/` behind HTTPS and reverse-proxy `/api` to the Node service. Set `TRUST_PROXY=true` only when one trusted reverse proxy sits in front of Node.
6. Check `/api/v1/health` for process liveness and `/api/v1/ready` for database readiness before routing traffic.

## Backup and restore

- Take nightly `pg_dump --format=custom --no-owner` backups, encrypt them, retain 30 daily and 12 monthly copies, and store them outside the production account.
- Test a restore monthly in an isolated database: `createdb ronjuices_restore`, then `pg_restore --clean --if-exists --no-owner --dbname=ronjuices_restore backup.dump`.
- Run the API integration suite against the restored database and record restore duration and row counts.
- Before a risky migration, take an on-demand backup and document its identifier in the deployment record. Database migrations are forward-only; restore the backup if rollback requires reversing data changes.

## Incidents

- Search JSON logs by `requestId`; return that ID to customers without exposing stack traces or credentials.
- If Paynow is degraded, keep orders in `awaiting_payment`/`pending`; never manually mark a payment paid without reconciling the gateway reference and amount.
- Rotate Paynow keys and the admin session secret after suspected compromise. Rotating the session secret immediately invalidates all admin sessions.
