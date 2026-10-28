import { Request, Response } from 'express';
import { PasswordResetError, StudentPasswordService } from './students-password.service.js';

const service = new StudentPasswordService();

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof PasswordResetError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

export class StudentPasswordController {
  // POST /api/students/forgot-password  — always answers the same, whether or not the email exists
  async forgot(req: Request, res: Response) {
    try {
      await service.requestLink(req.body.email);
    } catch (err) {
      console.error(err);
    }
    return res.json({ message: 'If that email is on our system, a reset link has been sent.' });
  }

  // GET /api/students/reset-password/verify?token=...
  async verify(req: Request, res: Response) {
    try {
      return res.json(await service.verifyLink(String(req.query.token ?? '')));
    } catch (err) {
      return fail(err, res, 'Could not verify the reset link');
    }
  }

  // POST /api/students/reset-password
  async reset(req: Request, res: Response) {
    try {
      await service.resetWithLink(req.body.token, req.body.password);
      return res.json({ message: 'Password updated. You can now sign in.' });
    } catch (err) {
      return fail(err, res, 'Could not reset password');
    }
  }

  // POST /api/students/me/password-otp
  async sendOtp(req: Request, res: Response) {
    try {
      return res.json(await service.sendOtp(req.user!.id));
    } catch (err) {
      return fail(err, res, 'Could not send the code');
    }
  }

  // POST /api/students/me/password-otp/confirm
  async confirmOtp(req: Request, res: Response) {
    try {
      await service.confirmOtp(req.user!.id, req.body.otp, req.body.password);
      return res.json({ message: 'Password updated.' });
    } catch (err) {
      return fail(err, res, 'Could not change password');
    }
  }
}