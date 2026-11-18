import type { CreateOrderInput } from "./order.schemas.js";

export type OrderItem = {
  productId: string;
  productName: string;
  volumeMl: number;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  currency: "USD" | "ZWG";
};

export type PublicOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  deliveryCents: number;
  discountCents: number;
  totalCents: number;
  currency: "USD" | "ZWG";
  deliveryAddress: CreateOrderInput["deliveryAddress"];
  customerNote: string | null;
  items: OrderItem[];
  createdAt: string;
};

export interface OrderService {
  create(input: CreateOrderInput, idempotencyKey: string): Promise<PublicOrder>;
  findByOrderNumber(orderNumber: string, customerEmail?: string): Promise<PublicOrder | null>;
}
