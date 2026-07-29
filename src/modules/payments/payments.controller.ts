import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { learningPlans, users } from '../../db/schema.js';
import { PaymentService } from './payments.service.js';

const paymentService = new PaymentService();

export class PaymentController {
  // Student-facing
  async initiate(req: Request, res: Response) {
    const studentProfile = await paymentService.getStudentProfileByUserId(req.user!.id);
    if (!studentProfile) return res.status(404).json({ message: 'Student profile not found' });

    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, req.body.learningPlanId)).limit(1);
    if (!plan || plan.studentId !== studentProfile.id) {
      return res.status(404).json({ message: 'Learning plan not found' });
    }

    try {
      const { payment, alreadyExisted, redirectUrl } = await paymentService.initiatePayment(
        studentProfile.id,
        plan.id,
        req.user!.email
      );

      return res.status(alreadyExisted ? 200 : 201).json({
        message: alreadyExisted
          ? 'A payment for this plan already exists'
          : 'Payment initiated — awaiting confirmation. For now, payments are manually approved by an admin after you complete a bank transfer.',
        payment,
        redirectUrl, // null for manual provider; populated once GafiaPay is wired in
      });
    } catch (err: any) {
      console.error(err);
      return res.status(400).json({ message: err.message || 'Error initiating payment' });
    }
  }

  // Admin-facing
  async listPending(req: Request, res: Response) {
    return res.json(await paymentService.listPayments('pending'));
  }
  async listAll(req: Request, res: Response) {
    return res.json(await paymentService.listPayments());
  }
  
  // Explicitly type req.params.id as string
  async approve(req: Request<{ id: string }>, res: Response) {
    const payment = await paymentService.approvePayment(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    return res.json({ message: 'Payment approved — student can now proceed', payment });
  }

  // Explicitly type req.params.id as string
  async reject(req: Request<{ id: string }>, res: Response) {
    const payment = await paymentService.rejectPayment(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    return res.json({ message: 'Payment rejected', payment });
  }
}
