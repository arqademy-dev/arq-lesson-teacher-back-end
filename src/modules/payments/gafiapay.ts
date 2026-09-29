// lib/payments/gafiapay.ts
const BASE_URL = 'https://api.gafiapay.com/api/v1/external';

export async function generateTemporalAccount({
  email,
  name,
  amount,
  reference,
  bvn,
  nin,
}: {
  email: string;
  name: string;
  amount: number;
  reference: string;
  bvn?: string;
  nin?: string;
}) {
  const payload = {
    email,
    name,
    amount,
    reference,
    bvn,
    nin,
  };

  const timestamp = Date.now().toString();
  const secretKey = process.env.GAFIAPAY_SECRET_KEY;
  const apiKey = process.env.GAFIAPAY_API_KEY;

  // Guard clause
  if (!secretKey || !apiKey) {
    throw new Error('GafiaPay environment variables are missing.');
  }

  // === HMAC-SHA256 Signature (Browser & Node compatible) ===
  const encoder = new TextEncoder();
  const signatureString = `${JSON.stringify(payload)}${timestamp}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureUint8 = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureString)
  );

  // Convert ArrayBuffer to hex string (same output as Node.js crypto)
  const signature = Array.from(new Uint8Array(signatureUint8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // === Make the API Request ===
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

  return response.json();
}