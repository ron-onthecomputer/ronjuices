# Upgrade Part 2: Orders and Paynow Zimbabwe

## Outcome

Part 2 turns a validated cart into a transactional guest order and pays it through Paynow Zimbabwe. The backend remains authoritative for totals, order state, payment state, and inventory.

## Database additions

- `customers`, `addresses`, `orders`, and immutable `order_items` snapshots.
- `payments` with gateway `paynow`, a unique merchant reference, Paynow poll URL, gateway status, amount, currency, attempts, and timestamps.
- Idempotency keys for order creation and payment initiation.
- Explicit order and payment status constraints.

## API

```text
POST /api/v1/orders
GET  /api/v1/orders/:orderNumber
POST /api/v1/payments/paynow/initiate
POST /api/v1/payments/paynow/result
GET  /api/v1/payments/:paymentId/status
POST /api/v1/payments/:paymentId/cancel
```

## Paynow flow

1. Revalidate product IDs and quantities and calculate totals from PostgreSQL.
2. Create the pending order and item snapshots in one transaction.
3. Create a unique merchant payment reference and send the server-calculated amount through the official Paynow Node SDK.
4. Save the returned redirect URL and poll URL before responding to the browser.
5. Redirect the customer to Paynow. Paynow posts updates to the result URL and returns the browser to the return URL.
6. Treat the browser return only as navigation. Reconcile payment state server-side using Paynow's status response/poll URL.
7. On the first confirmed paid transition, lock product rows with `SELECT ... FOR UPDATE`, recheck inventory, decrement stock, and mark the order paid in one transaction.
8. Make repeated result notifications and status checks idempotent so stock can only be decremented once.

## Required configuration

```text
PAYNOW_INTEGRATION_ID
PAYNOW_INTEGRATION_KEY
PAYNOW_RESULT_URL
PAYNOW_RETURN_URL
```

The credentials stay server-side. Logs may contain internal order/payment references but never integration keys or customer payment data.

## Currency policy

The application supports `USD` and Zimbabwe Gold (`ZWG`). Every order has exactly one currency, and its item snapshots, totals, and Paynow amount use that same denomination. Never sum mixed-currency lines or silently convert inside the Paynow adapter. Before initiating payment, the adapter must verify that the configured Paynow merchant profile accepts the order currency and return a safe configuration error if it does not. If customer-selected conversion is offered, the server must own the quoted rate, converted integer amount, and quote timestamp.

## Tests

- Client totals are ignored.
- Out-of-stock and excessive quantities are rejected.
- Order and item creation is atomic.
- Initiation retries reuse the same successful payment attempt.
- Result notifications and polling cannot mark a payment paid twice.
- Successful payment decrements stock exactly once.
- Failed, cancelled, or abandoned payments do not decrement stock.
- Concurrent payments cannot oversell a product.

