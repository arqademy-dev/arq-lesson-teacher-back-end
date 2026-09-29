import crypto from 'crypto';
import { PaymentProvider, PaymentInitiationResult } from './payment-provider.interface.js';

const BASE_URL = 'https://api.gafiapay.com/api/v1/external';
const TEMPORAL_ACCOUNT_TTL_MINUTES = 20;

export class GafiaPayProvider implements PaymentProvider {
  name = 'gafiapay';

  // Direct port of your working generateTemporalAccount() — same base URL,
  // same endpoint, same header names, same HMAC-SHA256(JSON.stringify(payload) + timestamp)
  // signing scheme. Only the caller-facing shape changed to match PaymentProvider.
  // (Your original used Web Crypto's subtle.sign for browser/Node portability —
  // this backend only ever runs in Node, so plain crypto.createHmac is simpler
  // and produces byte-identical hex output.)
  async initiate(params: { amountNaira: number; email: string; name: string; reference: string }): Promise<PaymentInitiationResult> {
    const secretKey = process.env.GAFIAPAY_SECRET_KEY;
    const apiKey = process.env.GAFIAPAY_API_KEY;
    const bvn = process.env.PREFERED_BVN;

    if (!secretKey || !apiKey) throw new Error('GafiaPay environment variables are missing.');
    if (!bvn) throw new Error('PREFERED_BVN is not configured');

    const payload = {
      email: params.email,
      name: params.name,
      amount: params.amountNaira,
      reference: params.reference,
      bvn,
    };

    const timestamp = Date.now().toString();
    const signatureString = `${JSON.stringify(payload)}${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(signatureString).digest('hex');

    const response = await fetch(`${BASE_URL}/account/generate/temporary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-signature': signature,
        'x-timestamp': timestamp,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GafiaPay failed: ${error}`);
    }

    const gafiaResponse = await response.json();

    return {
      providerReference: params.reference,
      virtualAccount: {
        accountNumber: gafiaResponse.data?.accountNumber,
        accountName: gafiaResponse.data?.accountName,
        bankName: gafiaResponse.data?.bankName || 'GafiaPay Virtual',
        expiresInMinutes: TEMPORAL_ACCOUNT_TTL_MINUTES,
      },
    };
  }
}