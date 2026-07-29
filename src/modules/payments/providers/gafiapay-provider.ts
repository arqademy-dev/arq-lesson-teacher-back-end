import { PaymentProvider, PaymentInitiationResult } from './payment-provider.interface.js';

const GAFIAPAY_SECRET_KEY = process.env.GAFIAPAY_SECRET_KEY;
const GAFIAPAY_WEBHOOK_SECRET = process.env.GAFIAPAY_WEBHOOK_SECRET;

export class GafiaPayProvider implements PaymentProvider {
  name = 'gafiapay';

  async initiate(params: { amountNaira: number; email: string; metadata: Record<string, any> }): Promise<PaymentInitiationResult> {
    // TODO: replace with GafiaPay's actual "initiate transaction" endpoint once you have their docs.
    // Typical shape for Nigerian gateways (Paystack/Flutterwave/Monnify all follow this):
    //
    // const res = await fetch('https://api.gafiapay.com/v1/transactions/initiate', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${GAFIAPAY_SECRET_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     amount: params.amountNaira * 100, // many gateways expect kobo, not naira — confirm this
    //     email: params.email,
    //     metadata: params.metadata,
    //   }),
    // });
    // const data = await res.json();
    // return { providerReference: data.data.reference, redirectUrl: data.data.authorization_url };

    throw new Error('GafiaPay integration not yet implemented — fill in this method once you have their API docs.');
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
    // TODO: most Nigerian gateways sign webhooks with HMAC-SHA512 of the raw body using your secret key.
    // Example (Paystack-style):
    // const crypto = require('crypto');
    // const hash = crypto.createHmac('sha512', GAFIAPAY_WEBHOOK_SECRET!).update(rawBody).digest('hex');
    // return hash === signatureHeader;
    return false;
  }

  extractStatusFromWebhook(payload: any): 'success' | 'failed' | 'pending' {
    // TODO: map GafiaPay's actual status field/values once known.
    // e.g. return payload.data.status === 'success' ? 'success' : 'failed';
    return 'pending';
  }

  extractReferenceFromWebhook(payload: any): string {
    // TODO: e.g. return payload.data.reference;
    return '';
  }
}