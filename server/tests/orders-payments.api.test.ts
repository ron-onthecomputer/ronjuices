import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { OrderService, PublicOrder } from "../src/modules/orders/order.types.js";
import type { PaymentService, PublicPayment } from "../src/modules/payments/payment.types.js";
import { FakeProductRepository } from "./helpers/product-repository.js";

const order: PublicOrder = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  orderNumber: "RJ-20261109-ABC12345",
  customerEmail: "buyer@example.com",
  status: "pending",
  paymentStatus: "unpaid",
  subtotalCents: 1400,
  deliveryCents: 0,
  discountCents: 0,
  totalCents: 1400,
  currency: "USD",
  deliveryAddress: { recipientName: "Test Buyer", line1: "1 Main Road", suburb: "Avondale",
    city: "Harare", province: "Harare", postalCode: "0000", country: "ZW" },
  customerNote: null,
  items: [],
  createdAt: "2026-11-09T10:00:00.000Z",
};

const payment: PublicPayment = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  orderId: order.id,
  gatewayReference: `${order.orderNumber}-123ABC`,
  status: "pending",
  amountCents: 1400,
  currency: "USD",
  redirectUrl: "https://www.paynow.co.zw/pay/123",
  gatewayStatus: "Ok",
  failureReason: null,
  attempts: 1,
};

function testApp() {
  const orderService: OrderService = {
    create: vi.fn().mockResolvedValue(order),
    findByOrderNumber: vi.fn().mockResolvedValue(order),
  };
  const paymentService: PaymentService = {
    initiate: vi.fn().mockResolvedValue(payment),
    reconcileById: vi.fn().mockResolvedValue({ ...payment, status: "paid" }),
    reconcileByReference: vi.fn().mockResolvedValue({ ...payment, status: "paid" }),
    cancel: vi.fn().mockResolvedValue({ ...payment, status: "cancelled" }),
  };
  return { app: createApp({ productRepository: new FakeProductRepository(), orderService,
    paymentService, clientOrigin: "http://localhost:3000" }), orderService, paymentService };
}

const checkout = {
  customer: { email: "buyer@example.com", firstName: "Test", lastName: "Buyer", phone: "+263771234567" },
  deliveryAddress: order.deliveryAddress,
  items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2, priceCents: 1 }],
};

describe("orders and Paynow API", () => {
  it("requires the checkout email when looking up an order", async () => {
    const { app, orderService } = testApp();
    await request(app).get(`/api/v1/orders/${order.orderNumber}`).expect(400);
    await request(app).get(`/api/v1/orders/${order.orderNumber}`).query({ email: order.customerEmail }).expect(200);
    expect(orderService.findByOrderNumber).toHaveBeenCalledWith(order.orderNumber, order.customerEmail);
  });

  it("requires and passes the order idempotency key while ignoring client totals", async () => {
    const { app, orderService } = testApp();
    const response = await request(app).post("/api/v1/orders").set("Idempotency-Key", "order-request-1")
      .send({ ...checkout, totalCents: 1 }).expect(201);
    expect(response.body.data.totalCents).toBe(1400);
    expect(orderService.create).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ productId: checkout.items[0]!.productId, quantity: 2 }],
    }), "order-request-1");
  });

  it("rejects payment initiation without an idempotency key", async () => {
    const { app, paymentService } = testApp();
    await request(app).post("/api/v1/payments/paynow/initiate").send({ orderId: order.id }).expect(400);
    expect(paymentService.initiate).not.toHaveBeenCalled();
  });

  it("reconciles the saved payment for status checks and Paynow notifications", async () => {
    const { app, paymentService } = testApp();
    await request(app).get(`/api/v1/payments/${payment.id}/status`).expect(200);
    await request(app).post("/api/v1/payments/paynow/result").type("form")
      .send({ reference: payment.gatewayReference, status: "Paid" }).expect(200, "OK");
    expect(paymentService.reconcileById).toHaveBeenCalledWith(payment.id);
    expect(paymentService.reconcileByReference).toHaveBeenCalledWith(payment.gatewayReference);
  });
});
