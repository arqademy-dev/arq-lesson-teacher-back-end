import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { learningPlans, users } from '../../db/schema.js';
import { PaymentService } from './payments.service.js';

const paymentService = new PaymentService();

export class PaymentController {
  // Student-facing
  // async initiate(req: Request, res: Response) {
  //   const studentProfile = await paymentService.getStudentProfileByUserId(req.user!.id);
  //   if (!studentProfile) return res.status(404).json({ message: 'Student profile not found' });

  //     const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, req.body.learningPlanId)).limit(1);

  //     // ---- ADD THIS LOG BLOCK ----
  //     console.log('--- DEBUG LEARNING PLAN ---');
  //     console.log('Fetched Plan Record:', plan);
  //     console.log('req.body.learningPlanId:', req.body.learningPlanId);
  //     console.log('plan.studentId:', plan?.studentId, `(Type: ${typeof plan?.studentId})`);
  //     console.log('studentProfile.id:', studentProfile?.id, `(Type: ${typeof studentProfile?.id})`);
  //     console.log('Does plan exist?:', !!plan);
  //     console.log('Do IDs match?:', plan?.studentId === studentProfile?.id);
  //     console.log('---------------------------');

  //     if (!plan || plan.studentId !== studentProfile.id) {
  //       return res.status(404).json({ message: 'Learning plan not found' });
  //     }


  //   try {
  //     const { payment, alreadyExisted, redirectUrl } = await paymentService.initiatePayment(
  //       studentProfile.id,
  //       plan.id,
  //       req.user!.email
  //     );

  //     return res.status(alreadyExisted ? 200 : 201).json({
  //       message: alreadyExisted
  //         ? 'A payment for this plan already exists'
  //         : 'Payment initiated — awaiting confirmation. For now, payments are manually approved by an admin after you complete a bank transfer.',
  //       payment,
  //       redirectUrl, // null for manual provider; populated once GafiaPay is wired in
  //     });
  //   } catch (err: any) {
  //     console.error(err);
  //     return res.status(400).json({ message: err.message || 'Error initiating payment' });
  //   }
  // }

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

  async myPayments(req: Request, res: Response) {
    const studentProfile = await paymentService.getStudentProfileByUserId(req.user!.id);
    if (!studentProfile) return res.status(404).json({ message: 'Student profile not found' });

    const list = await paymentService.listPaymentsForStudent(studentProfile.id);
    return res.json(list);
  }

  // Two changes to your existing PaymentController:
// 1. `initiate` — name now comes from req.user (students has no firstName/lastName;
//    those live on `users`), with an email fallback like your original `'Customer'`.
// 2. New `getStatus` — a lightweight polling endpoint mirroring your proven
//    GET /api/payments/status route, scoped so a student can only poll their own payment.

  async initiate(req: Request, res: Response) {
    const studentProfile = await paymentService.getStudentProfileByUserId(req.user!.id);
    if (!studentProfile) return res.status(404).json({ message: 'Student profile not found' });

    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, req.body.learningPlanId)).limit(1);
    if (!plan || plan.studentId !== studentProfile.id) {
      return res.status(404).json({ message: 'Learning plan not found' });
    }

    try {
      const name = (req.user as any).firstName
        ? `${(req.user as any).firstName} ${(req.user as any).lastName ?? ''}`.trim()
        : req.user!.email;

      const { payment, alreadyExisted, redirectUrl, virtualAccount } = await paymentService.initiatePayment(
        studentProfile.id,
        plan.id,
        req.user!.email,
        name
      );

      return res.status(alreadyExisted ? 200 : 201).json({
        message: alreadyExisted
          ? 'A payment for this plan already exists'
          : 'Virtual account generated — transfer the exact amount before it expires.',
        paymentId: payment.id,
        payment,
        redirectUrl,
        virtualAccount, // { accountNumber, accountName, bankName, expiresAt }
      });
    } catch (err: any) {
      console.error(err);
      return res.status(400).json({ message: err.message || 'Error initiating payment' });
    }
  }

  // GET /api/students/payments/:paymentId/status — cheap polling target, no
  // full row, no join. Ownership-checked so a student can't probe someone
  // else's payment by guessing an id (same guard as your proven route).
  async getStatus(req: Request<{ paymentId: string }>, res: Response) {
    const studentProfile = await paymentService.getStudentProfileByUserId(req.user!.id);
    if (!studentProfile) return res.status(404).json({ message: 'Student profile not found' });

    const payment = await paymentService.getById(req.params.paymentId);
    if (!payment || payment.studentId !== studentProfile.id) {
      return res.status(404).json({ message: 'Not found' });
    }

    return res.json({ status: payment.status, paidAt: payment.paidAt ?? null });
  }
}
