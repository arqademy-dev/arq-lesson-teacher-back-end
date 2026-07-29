import { PaymentProvider, PaymentInitiationResult } from './payment-provider.interface.js';

export class ManualPaymentProvider implements PaymentProvider {
  name = 'manual';

  async initiate(): Promise<PaymentInitiationResult> {
    // No external call — this just marks the payment as awaiting admin confirmation
    // (e.g. a bank transfer the admin manually reconciles).
    return { providerReference: `MANUAL-${Date.now()}` };
  }

  verifyWebhookSignature(): boolean {
    return true; // no webhook exists for manual payments
  }

  extractStatusFromWebhook(): 'success' | 'failed' | 'pending' {
    return 'pending'; // status changes only via the admin approve/reject endpoints
  }

  extractReferenceFromWebhook(): string {
    return '';
  }
}