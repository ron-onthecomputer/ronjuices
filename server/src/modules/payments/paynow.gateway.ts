import { Paynow } from "paynow";
import type { Currency } from "../products/product.types.js";
import { ApiError } from "../../utils/api-error.js";

export type GatewayStatus = { reference?: string; status: string; amountCents?: number };

export interface PaynowGateway {
  initiate(input: { reference: string; email: string; amountCents: number; currency: Currency }): Promise<{
    redirectUrl: string; pollUrl: string; gatewayStatus: string;
  }>;
  poll(pollUrl: string): Promise<GatewayStatus>;
}

export type PaynowGatewayConfig = {
  integrationId: string;
  integrationKey: string;
  resultUrl: string;
  returnUrl: string;
  acceptedCurrencies: readonly Currency[];
};

function centsFromGatewayAmount(amount: string | undefined): number | undefined {
  if (!amount) return undefined;
  const value = Number(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

export function createPaynowGateway(config: PaynowGatewayConfig): PaynowGateway {
  return {
    async initiate(input) {
      if (!config.acceptedCurrencies.includes(input.currency)) {
        throw new ApiError(503, "PAYNOW_CURRENCY_NOT_CONFIGURED", `Paynow is not configured to accept ${input.currency}`);
      }
      if (!config.integrationId || !config.integrationKey || !config.resultUrl || !config.returnUrl) {
        throw new ApiError(503, "PAYNOW_NOT_CONFIGURED", "Paynow payment processing is not configured");
      }
      const client = new Paynow(config.integrationId, config.integrationKey, config.resultUrl, config.returnUrl);
      const payment = client.createPayment(input.reference, input.email);
      payment.add(input.reference, input.amountCents / 100);
      const result = await client.send(payment);
      if (!result?.success || !result.redirectUrl || !result.pollUrl) {
        throw new ApiError(502, "PAYNOW_INITIATION_FAILED", "Paynow could not initiate the payment");
      }
      return { redirectUrl: String(result.redirectUrl), pollUrl: String(result.pollUrl), gatewayStatus: String(result.status ?? "Ok") };
    },
    async poll(pollUrl) {
      if (!config.integrationId || !config.integrationKey) {
        throw new ApiError(503, "PAYNOW_NOT_CONFIGURED", "Paynow payment processing is not configured");
      }
      const client = new Paynow(config.integrationId, config.integrationKey, config.resultUrl, config.returnUrl);
      const result = await client.pollTransaction(pollUrl);
      if (!result?.status) throw new ApiError(502, "PAYNOW_STATUS_FAILED", "Paynow status could not be confirmed");
      const status: GatewayStatus = { status: String(result.status) };
      if (result.reference) status.reference = String(result.reference);
      const amountCents = centsFromGatewayAmount(result.amount ? String(result.amount) : undefined);
      if (amountCents !== undefined) status.amountCents = amountCents;
      return status;
    },
  };
}
