import { randomBytes } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { getPool } from "../../db/pool.js";
import { ApiError } from "../../utils/api-error.js";
import type { PaynowGateway, GatewayStatus } from "./paynow.gateway.js";
import type { PaymentService, PublicPayment } from "./payment.types.js";

type PaymentRow = QueryResultRow & {
  id: string; order_id: string; gateway_reference: string;
  status: PublicPayment["status"]; amount_cents: number; currency: "USD" | "ZWG";
  poll_url: string | null; redirect_url: string | null; gateway_status: string | null;
  failure_reason: string | null; attempts: number; idempotency_key: string;
};
type OrderRow = QueryResultRow & { id: string; order_number: string; customer_email: string;
  status: string; payment_status: string; total_cents: number; currency: "USD" | "ZWG" };
type StockRow = QueryResultRow & { product_id: string; product_name: string; quantity: number; stock_quantity: number; is_active: boolean };

const paidStatuses = new Set(["paid", "awaiting delivery", "delivered"]);
const cancelledStatuses = new Set(["cancelled", "canceled", "refunded"]);
const failedStatuses = new Set(["failed", "error", "disputed"]);

function mapPayment(row: PaymentRow): PublicPayment {
  return { id: row.id, orderId: row.order_id, gatewayReference: row.gateway_reference,
    status: row.status, amountCents: row.amount_cents, currency: row.currency,
    redirectUrl: row.redirect_url, gatewayStatus: row.gateway_status,
    failureReason: row.failure_reason, attempts: row.attempts };
}

async function getPayment(pool: Pool, id: string): Promise<PaymentRow> {
  const result = await pool.query<PaymentRow>("SELECT * FROM payments WHERE id = $1", [id]);
  if (!result.rows[0]) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  return result.rows[0];
}

async function applyStatus(pool: Pool, paymentId: string, gateway: GatewayStatus): Promise<PaymentRow> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const selected = await client.query<PaymentRow>("SELECT * FROM payments WHERE id = $1 FOR UPDATE", [paymentId]);
    const payment = selected.rows[0];
    if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (payment.status === "paid" || payment.status === "cancelled") {
      await client.query("COMMIT");
      return payment;
    }
    if (gateway.reference && gateway.reference !== payment.gateway_reference) {
      throw new ApiError(502, "PAYNOW_REFERENCE_MISMATCH", "Paynow returned a mismatched payment reference");
    }
    if (gateway.amountCents !== undefined && gateway.amountCents !== payment.amount_cents) {
      await client.query("UPDATE payments SET status = 'failed', gateway_status = $2, failure_reason = 'Gateway amount mismatch' WHERE id = $1", [payment.id, gateway.status]);
      await client.query("UPDATE orders SET status = 'payment_failed', payment_status = 'failed' WHERE id = $1", [payment.order_id]);
    } else {
      const normalized = gateway.status.trim().toLowerCase();
      if (paidStatuses.has(normalized)) {
        const stock = await client.query<StockRow>(
          `SELECT oi.product_id, oi.product_name, oi.quantity, p.stock_quantity, p.is_active
           FROM order_items oi JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = $1 ORDER BY oi.product_id FOR UPDATE OF p`, [payment.order_id],
        );
        const insufficient = stock.rows.find((item) => !item.is_active || item.stock_quantity < item.quantity);
        if (insufficient) {
          await client.query("UPDATE payments SET status = 'failed', gateway_status = $2, failure_reason = $3 WHERE id = $1",
            [payment.id, gateway.status, `Inventory unavailable for ${insufficient.product_name}`]);
          await client.query("UPDATE orders SET status = 'payment_failed', payment_status = 'failed' WHERE id = $1", [payment.order_id]);
        } else {
          for (const item of stock.rows) {
            await client.query("UPDATE products SET stock_quantity = stock_quantity - $2 WHERE id = $1", [item.product_id, item.quantity]);
          }
          await client.query("UPDATE payments SET status = 'paid', gateway_status = $2, failure_reason = NULL WHERE id = $1", [payment.id, gateway.status]);
          await client.query("UPDATE orders SET status = 'paid', payment_status = 'paid' WHERE id = $1", [payment.order_id]);
        }
      } else if (cancelledStatuses.has(normalized)) {
        await client.query("UPDATE payments SET status = 'cancelled', gateway_status = $2 WHERE id = $1", [payment.id, gateway.status]);
        await client.query("UPDATE orders SET status = 'cancelled', payment_status = 'cancelled' WHERE id = $1", [payment.order_id]);
      } else if (failedStatuses.has(normalized)) {
        await client.query("UPDATE payments SET status = 'failed', gateway_status = $2, failure_reason = 'Payment was not successful' WHERE id = $1", [payment.id, gateway.status]);
        await client.query("UPDATE orders SET status = 'payment_failed', payment_status = 'failed' WHERE id = $1", [payment.order_id]);
      } else {
        await client.query("UPDATE payments SET status = 'pending', gateway_status = $2 WHERE id = $1", [payment.id, gateway.status]);
      }
    }
    const updated = await client.query<PaymentRow>("SELECT * FROM payments WHERE id = $1", [payment.id]);
    await client.query("COMMIT");
    return updated.rows[0]!;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function createPaymentService(gateway: PaynowGateway, pool: Pool = getPool()): PaymentService {
  async function reconcile(row: PaymentRow): Promise<PaymentRow> {
    if (row.status === "paid" || row.status === "failed" || row.status === "cancelled") return row;
    if (!row.poll_url) throw new ApiError(409, "PAYMENT_NOT_READY", "Payment initiation has not completed");
    const gatewayStatus = await gateway.poll(row.poll_url);
    return applyStatus(pool, row.id, gatewayStatus);
  }

  return {
    async initiate(orderId, idempotencyKey) {
      const client = await pool.connect();
      let created: PaymentRow;
      let order: OrderRow;
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
        const orderResult = await client.query<OrderRow>("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
        order = orderResult.rows[0]!;
        if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
        const byKey = await client.query<PaymentRow>("SELECT * FROM payments WHERE idempotency_key = $1", [idempotencyKey]);
        if (byKey.rows[0]) {
          if (byKey.rows[0].order_id !== orderId) throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "The idempotency key belongs to another payment");
          await client.query("COMMIT");
          return mapPayment(byKey.rows[0]);
        }
        const reusable = await client.query<PaymentRow>(
          `SELECT * FROM payments WHERE order_id = $1 AND status IN ('created','pending','paid') ORDER BY created_at DESC LIMIT 1`, [orderId],
        );
        if (reusable.rows[0]) {
          if (reusable.rows[0].status === "created" && !reusable.rows[0].redirect_url) {
            throw new ApiError(409, "PAYMENT_INITIATION_IN_PROGRESS", "Payment initiation is already in progress");
          }
          await client.query("COMMIT");
          return mapPayment(reusable.rows[0]);
        }
        if (["paid", "completed", "cancelled"].includes(order.status)) throw new ApiError(409, "ORDER_NOT_PAYABLE", "This order cannot be paid");
        const reference = `${order.order_number}-${randomBytes(3).toString("hex").toUpperCase()}`;
        const result = await client.query<PaymentRow>(
          `INSERT INTO payments (order_id, gateway_reference, amount_cents, currency, idempotency_key, attempts)
           VALUES ($1,$2,$3,$4,$5,1) RETURNING *`, [order.id, reference, order.total_cents, order.currency, idempotencyKey],
        );
        created = result.rows[0]!;
        await client.query("UPDATE orders SET status = 'awaiting_payment', payment_status = 'pending' WHERE id = $1", [order.id]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }

      try {
        const result = await gateway.initiate({ reference: created.gateway_reference, email: order.customer_email,
          amountCents: created.amount_cents, currency: created.currency });
        const updated = await pool.query<PaymentRow>(
          `UPDATE payments SET status = 'pending', redirect_url = $2, poll_url = $3, gateway_status = $4
           WHERE id = $1 RETURNING *`, [created.id, result.redirectUrl, result.pollUrl, result.gatewayStatus],
        );
        return mapPayment(updated.rows[0]!);
      } catch (error) {
        await pool.query("UPDATE payments SET status = 'failed', failure_reason = 'Paynow initiation failed' WHERE id = $1", [created.id]);
        await pool.query("UPDATE orders SET status = 'payment_failed', payment_status = 'failed' WHERE id = $1", [created.order_id]);
        throw error;
      }
    },
    async reconcileById(paymentId) { return mapPayment(await reconcile(await getPayment(pool, paymentId))); },
    async reconcileByReference(reference) {
      const result = await pool.query<PaymentRow>("SELECT * FROM payments WHERE gateway_reference = $1", [reference]);
      return result.rows[0] ? mapPayment(await reconcile(result.rows[0])) : null;
    },
    async cancel(paymentId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<PaymentRow>("SELECT * FROM payments WHERE id = $1 FOR UPDATE", [paymentId]);
        const payment = result.rows[0];
        if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
        if (payment.status === "paid") throw new ApiError(409, "PAID_PAYMENT_CANNOT_BE_CANCELLED", "A paid payment cannot be cancelled");
        if (payment.status !== "cancelled") {
          await client.query("UPDATE payments SET status = 'cancelled', failure_reason = 'Cancelled by customer' WHERE id = $1", [payment.id]);
          await client.query("UPDATE orders SET status = 'cancelled', payment_status = 'cancelled' WHERE id = $1", [payment.order_id]);
        }
        const updated = await client.query<PaymentRow>("SELECT * FROM payments WHERE id = $1", [payment.id]);
        await client.query("COMMIT");
        return mapPayment(updated.rows[0]!);
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
  };
}
