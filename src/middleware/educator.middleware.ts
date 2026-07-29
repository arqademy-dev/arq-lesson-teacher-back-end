import { Request, Response, NextFunction } from 'express';
import { UserService } from '../modules/users/users.service.js';

const userService = new UserService();

declare global {
  namespace Express {
    interface Request {
      educatorProfile?: {
        id: string;
        userId: string;
        accountApproval: string;
        [key: string]: any;
      };
    }
  }
}

export async function requireApprovedEducator(req: Request, res: Response, next: NextFunction) {
  const profile = await userService.findEducatorProfileByUserId(req.user!.id);

  if (!profile) {
    return res.status(404).json({ message: 'Educator profile not found' });
  }
  if (profile.accountApproval !== 'approve') {
    return res.status(403).json({ message: `Account not approved yet (status: ${profile.accountApproval})` });
  }

  req.educatorProfile = profile;
  next();
}