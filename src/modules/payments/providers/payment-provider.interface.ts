export interface VirtualAccountDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
  expiresInMinutes: number;
}

export interface PaymentInitiationResult {
  providerReference: string; // our own bookkeeping reference, sent to GafiaPay but NOT what its webhook reconciles by
  redirectUrl?: string; // unused by GafiaPay's temporal-account flow; kept for any future hosted-checkout provider
  virtualAccount?: VirtualAccountDetails;
}

export interface PaymentProvider {
  name: string;
  initiate(params: { amountNaira: number; email: string; name: string; reference: string }): Promise<PaymentInitiationResult>;
}