import { createHash, randomBytes } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { getPool } from "../../db/pool.js";
import { ApiError } from "../../utils/api-error.js";
import type { CreateOrderInput } from "./order.schemas.js";
import type { OrderItem, OrderService, PublicOrder } from "./order.types.js";

type OrderRow = QueryResultRow & {
  id: string; order_number: string; customer_email: string; status: string; payment_status: string;
  subtotal_cents: number; delivery_cents: number; discount_cents: number; total_cents: number;
  currency: "USD" | "ZWG"; delivery_address: CreateOrderInput["deliveryAddress"];
  customer_note: string | null; created_at: Date; request_fingerprint: string;
};

type ProductRow = QueryResultRow & {
  id: string; name: string; volume_ml: number; price_cents: number; currency: "USD" | "ZWG";
  stock_quantity: number; is_active: boolean;
};

type ItemRow = QueryResultRow & {
  product_id: string; product_name: string; volume_ml: number; unit_price_cents: number;
  quantity: number; line_total_cents: number; currency: "USD" | "ZWG";
};

function fingerprint(input: CreateOrderInput): string {
  const { idempotencyKey: _ignored, ...businessInput } = input;
  return createHash("sha256").update(JSON.stringify(businessInput)).digest("hex");
}

function orderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `RJ-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function mapItems(rows: ItemRow[]): OrderItem[] {
  return rows.map((row) => ({ productId: row.product_id, productName: row.product_name,
    volumeMl: row.volume_ml, unitPriceCents: row.unit_price_cents, quantity: row.quantity,
    lineTotalCents: row.line_total_cents, currency: row.currency }));
}

async function hydrate(client: Pick<PoolClient, "query"> | Pool, row: OrderRow): Promise<PublicOrder> {
  const items = await client.query<ItemRow>(
    `SELECT product_id, product_name, volume_ml, unit_price_cents, quantity, line_total_cents, currency
     FROM order_items WHERE order_id = $1 ORDER BY created_at, id`, [row.id],
  );
  return { id: row.id, orderNumber: row.order_number, customerEmail: row.customer_email,
    status: row.status, paymentStatus: row.payment_status, subtotalCents: row.subtotal_cents,
    deliveryCents: row.delivery_cents, discountCents: row.discount_cents,
    totalCents: row.total_cents, currency: row.currency, deliveryAddress: row.delivery_address,
    customerNote: row.customer_note, items: mapItems(items.rows), createdAt: row.created_at.toISOString() };
}

export function createOrderService(pool: Pool = getPool()): OrderService {
  return {
    async create(input, idempotencyKey) {
      const requestFingerprint = fingerprint(input);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [idempotencyKey]);
        const existing = await client.query<OrderRow>("SELECT * FROM orders WHERE idempotency_key = $1 FOR UPDATE", [idempotencyKey]);
        if (existing.rows[0]) {
          if (existing.rows[0].request_fingerprint !== requestFingerprint) {
            throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "The idempotency key was already used for another order");
          }
          const result = await hydrate(client, existing.rows[0]);
          await client.query("COMMIT");
          return result;
        }

        const productIds = input.items.map((item) => item.productId);
        const products = await client.query<ProductRow>(
          `SELECT id, name, volume_ml, price_cents, currency, stock_quantity, is_active
           FROM products WHERE id = ANY($1::uuid[])`, [productIds],
        );
        const byId = new Map(products.rows.map((product) => [product.id, product]));
        const snapshots = input.items.map((item) => {
          const product = byId.get(item.productId);
          if (!product) throw new ApiError(422, "PRODUCT_NOT_FOUND", `Product ${item.productId} was not found`);
          if (!product.is_active || product.stock_quantity === 0) throw new ApiError(409, "PRODUCT_UNAVAILABLE", `${product.name} is unavailable`);
          if (item.quantity > product.stock_quantity) throw new ApiError(409, "INSUFFICIENT_STOCK", `Only ${product.stock_quantity} of ${product.name} remain`);
          return { product, quantity: item.quantity, lineTotalCents: product.price_cents * item.quantity };
        });
        const currencies = new Set(snapshots.map(({ product }) => product.currency));
        if (currencies.size !== 1) throw new ApiError(422, "MIXED_CURRENCY", "An order may only contain one currency");
        const subtotalCents = snapshots.reduce((sum, item) => sum + item.lineTotalCents, 0);
        const deliveryCents = 0;
        const discountCents = 0;
        const totalCents = subtotalCents + deliveryCents - discountCents;
        if (totalCents <= 0) throw new ApiError(422, "INVALID_ORDER_TOTAL", "The order total must be greater than zero");

        const customer = await client.query<{ id: string }>(
          `INSERT INTO customers (email, first_name, last_name, phone) VALUES ($1, $2, $3, $4) RETURNING id`,
          [input.customer.email, input.customer.firstName, input.customer.lastName, input.customer.phone],
        );
        const customerId = customer.rows[0]!.id;
        await client.query(
          `INSERT INTO addresses (customer_id, recipient_name, line_1, line_2, suburb, city, province, postal_code, country)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [customerId, input.deliveryAddress.recipientName, input.deliveryAddress.line1,
            input.deliveryAddress.line2 ?? null, input.deliveryAddress.suburb, input.deliveryAddress.city,
            input.deliveryAddress.province, input.deliveryAddress.postalCode, input.deliveryAddress.country],
        );
        const inserted = await client.query<OrderRow>(
          `INSERT INTO orders (order_number, customer_id, customer_email, subtotal_cents, delivery_cents,
             discount_cents, total_cents, currency, delivery_address, customer_note, idempotency_key, request_fingerprint)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12) RETURNING *`,
          [orderNumber(), customerId, input.customer.email, subtotalCents, deliveryCents, discountCents,
            totalCents, snapshots[0]!.product.currency, JSON.stringify(input.deliveryAddress),
            input.customerNote ?? null, idempotencyKey, requestFingerprint],
        );
        const order = inserted.rows[0]!;
        for (const { product, quantity, lineTotalCents } of snapshots) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name, volume_ml, unit_price_cents, quantity, line_total_cents, currency)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [order.id, product.id, product.name, product.volume_ml, product.price_cents, quantity, lineTotalCents, product.currency],
          );
        }
        const result = await hydrate(client, order);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    },

    async findByOrderNumber(value, customerEmail) {
      const result = await pool.query<OrderRow>("SELECT * FROM orders WHERE order_number = $1 AND ($2::text IS NULL OR customer_email = $2)", [value, customerEmail ?? null]);
      return result.rows[0] ? hydrate(pool, result.rows[0]) : null;
    },
  };
}
