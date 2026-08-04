import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserService } from './users.service.js';
import { AuthenticatedUser } from '../../middleware/auth.middleware.js';
import { getAuthCookieOptions } from '../../utils/cookie-options.js';

const userService = new UserService();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-dev-secret-key-change-me';

export class UserController {
  async register(req: Request, res: Response) {
    const { email, password, firstName, lastName } = req.body;

    try {
      const existingUser = await userService.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email identifier already registered' });
      }

      const createdUser = await userService.registerEducator({ email, password, firstName, lastName });
      return res.status(201).json({
        message: 'Educator registered successfully. Account approval is pending.',
        arqId: createdUser.arqId,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error processing registration' });
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const user = await userService.findUserByEmail(email);
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, getAuthCookieOptions());

      const profile = await userService.findEducatorProfileByUserId(user.id);
      const currentApprovalState = profile ? profile.accountApproval : 'pending';

      return res.status(200).json({
        message: 'Login execution successful.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          arqId: user.arqId,
          active: user.active,
          onboardingStatus: currentApprovalState,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal authentication engine failure' });
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('token', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
    return res.status(200).json({ message: 'Logout successful' });
  }

  async getMe(req: Request, res: Response) {
    const tokenPayload = req.user as AuthenticatedUser;
    const user = await userService.findUserByEmail(tokenPayload.email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = await userService.findEducatorProfileByUserId(user.id);
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      arqId: user.arqId,
      approvalStatus: profile ? profile.accountApproval : 'none',
    });
  }
}