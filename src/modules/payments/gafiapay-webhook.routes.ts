import { Router, raw } from 'express';
import { GafiaPayWebhookController } from './gafiapay-webhook.controller.js';

const controller = new GafiaPayWebhookController();
const router = Router();

// No authenticate/requireRole — GafiaPay calls this directly, not a logged-in
// user. Security is the IP allowlist (production only) plus the signature
// check inside the controller, both of which need the raw body/headers intact.
router.post('/gafiapay', raw({ type: '*/*' }), controller.handle);

export { router as gafiaPayWebhookRoutes };

// Mount in app.ts:
//   app.use('/api/payments/webhooks', gafiaPayWebhookRoutes);
//
// ORDERING CAVEAT: mount this router BEFORE any global app.use(express.json()),
// or exclude this exact path from it — otherwise req.body arrives already
// parsed into an object instead of the raw Buffer the signature check needs.