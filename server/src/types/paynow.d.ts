declare module "paynow" {
  export class Payment {
    add(title: string, amount: number): void;
  }
  export class Paynow {
    constructor(integrationId: string, integrationKey: string, resultUrl: string, returnUrl: string);
    createPayment(reference: string, authEmail: string): Payment;
    send(payment: Payment): Promise<{
      success: boolean; redirectUrl?: String; pollUrl?: String; status?: String; error?: String;
    } | null>;
    pollTransaction(url: string): Promise<{
      reference?: String; amount?: String; paynowReference?: String; pollUrl?: String;
      status?: String; error?: String;
    } | null>;
  }
}
