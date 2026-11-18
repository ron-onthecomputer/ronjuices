export type PublicPayment = {
  id: string;
  orderId: string;
  gatewayReference: string;
  status: "created" | "pending" | "paid" | "failed" | "cancelled";
  amountCents: number;
  currency: "USD" | "ZWG";
  redirectUrl: string | null;
  gatewayStatus: string | null;
  failureReason: string | null;
  attempts: number;
};

export interface PaymentService {
  initiate(orderId: string, idempotencyKey: string): Promise<PublicPayment>;
  reconcileById(paymentId: string): Promise<PublicPayment>;
  reconcileByReference(reference: string): Promise<PublicPayment | null>;
  cancel(paymentId: string): Promise<PublicPayment>;
}
