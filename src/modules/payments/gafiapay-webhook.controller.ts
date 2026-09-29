import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from './payments.service.js';

const paymentService = new PaymentService();

const GAFIAPAY_SECRET = process.env.GAFIAPAY_SECRET_KEY!;
// Same allowlisted IP as your proven webhook — override via env if GafiaPay
// ever rotates it, without needing a code change.
const GAFIAPAY_IP = process.env.GAFIAPAY_WEBHOOK_IP || '38.242.149.154';
// Absorbs rounding/charge differences, same tolerance as your e-commerce version.
const AMOUNT_TOLERANCE = 1;

export class GafiaPayWebhookController {
  async handle(req: Request, res: Response) {
    let rawBody = '';

    try {
      // req.body is a raw Buffer here (see the route file) — required so the
      // signature is computed over/against the exact request GafiaPay sent.
      rawBody = (req.body as Buffer).toString('utf8');

      // ── IP validation (skip in development, same as your proven code) ──
      if (process.env.NODE_ENV === 'production') {
        const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
        const cfConnectingIp = req.headers['cf-connecting-ip'] as string | undefined;
        const incomingIp = forwardedFor?.split(',')[0].trim();

        if (incomingIp !== GAFIAPAY_IP && cfConnectingIp !== GAFIAPAY_IP) {
          console.warn(`Blocked GafiaPay webhook — xff:${incomingIp} cf:${cfConnectingIp}`);
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      // ── Signature verification ──
      // NOTE: this signs only the timestamp, not the body — matches your
      // production GafiaPay integration exactly, unusual as that is.
      const signature = req.header('x-signature');
      const timestamp = req.header('x-timestamp');

      if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing auth headers' });
      }

      const expectedSignature = crypto.createHmac('sha256', GAFIAPAY_SECRET).update(timestamp).digest('hex');

      if (signature !== expectedSignature) {
        console.error('GafiaPay webhook: signature mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // ── Parse payload ──
      const payload = JSON.parse(rawBody);
      const transaction = payload?.data?.transaction;

      if (!transaction) {
        console.warn('GafiaPay webhook: no transaction in payload');
        return res.json({ received: true });
      }

      const virtualAccountNo = transaction.metadata?.virtualAccountNo;
      const gafiaStatus = String(transaction.status ?? '').toLowerCase();

      console.log(`GafiaPay webhook received — account: ${virtualAccountNo}, status: ${gafiaStatus}`);

      if (!virtualAccountNo) {
        console.warn('GafiaPay webhook: no virtualAccountNo in metadata');
        return res.json({ received: true });
      }

      // ── Find payment record — reconciled by ACCOUNT NUMBER, not our reference ──
      const payment = await paymentService.getByGafiaAccountNumber(virtualAccountNo);
      if (!payment) {
        console.warn(`GafiaPay webhook: no payment found for account ${virtualAccountNo}`);
        return res.json({ received: true });
      }

      // ── Idempotency — GafiaPay may retry delivery ──
      if (payment.status === 'success') {
        return res.json({ received: true, alreadyProcessed: true });
      }

      // ── Map status ──
      let newStatus: 'pending' | 'success' | 'failed' = 'pending';
      if (gafiaStatus === 'completed' || gafiaStatus === 'success') newStatus = 'success';
      else if (gafiaStatus === 'failed') newStatus = 'failed';

      // ── Amount verification — only matters on a claimed success ──
      if (newStatus === 'success') {
        const expectedAmount = payment.amountNaira;
        const paidAmount = Number(transaction.amount);

        if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - expectedAmount) > AMOUNT_TOLERANCE) {
          console.error(
            `GafiaPay webhook: amount mismatch for payment ${payment.id} — expected ${expectedAmount}, got ${paidAmount}`
          );
          // Flagged, not applied — same as your e-commerce version. Wire this
          // to your own logging table/alerting if you have one; deliberately
          // not inventing a new `logs` table here without knowing its shape.
          return res.json({ received: true, flagged: 'amount_mismatch' });
        }
      }

      if (newStatus === 'success') await paymentService.approvePayment(payment.id);
      else if (newStatus === 'failed') await paymentService.rejectPayment(payment.id);
      // else: still pending on GafiaPay's side — nothing to change yet.

      console.log(`GafiaPay webhook: payment ${payment.id} -> ${newStatus}`);
      return res.json({ received: true, success: true });
    } catch (err: any) {
      console.error('GafiaPay webhook error:', err.message, err.stack);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}