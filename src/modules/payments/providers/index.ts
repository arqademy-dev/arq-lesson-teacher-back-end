import { PaymentProvider } from './payment-provider.interface.js';
import { ManualPaymentProvider } from './manual-provider.js';
import { GafiaPayProvider } from './gafiapay-provider.js';

export function getPaymentProvider(): PaymentProvider {
  const providerName = process.env.PAYMENT_PROVIDER || 'manual';
  switch (providerName) {
    case 'gafiapay':
      return new GafiaPayProvider();
    case 'manual':
    default:
      return new ManualPaymentProvider();
  }
}