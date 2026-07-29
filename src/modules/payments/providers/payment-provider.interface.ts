export interface PaymentInitiationResult {
  providerReference: string;
  redirectUrl?: string; // where to send the student/parent to complete payment (if applicable)
}

export interface PaymentProvider {
  name: string;
  initiate(params: { amountNaira: number; email: string; metadata: Record<string, any> }): Promise<PaymentInitiationResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean;
  extractStatusFromWebhook(payload: any): 'success' | 'failed' | 'pending';
  extractReferenceFromWebhook(payload: any): string;
}