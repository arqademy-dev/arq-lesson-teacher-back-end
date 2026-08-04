import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AdminService } from './admin.service.js';
import { getAuthCookieOptions } from '../../utils/cookie-options.js';

const adminService = new AdminService();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-dev-secret-key-change-me';

export class AdminController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      const admin = await adminService.findAdminByEmail(email);
      if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, getAuthCookieOptions());

      return res.status(200).json({
        message: 'Admin login successful',
        user: { id: admin.id, email: admin.email, role: admin.role },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal authentication error' });
    }
  }

  async listPendingEducators(req: Request, res: Response) {
    const educators = await adminService.listEducators('pending');
    return res.json(educators);
  }

  async listAllEducators(req: Request, res: Response) {
    const educators = await adminService.listEducators();
    return res.json(educators);
  }

  async updateEducatorApproval(req: Request, res: Response) {
    const { educatorId } = req.params as { educatorId: string };
    const { action } = req.body; // 'approve' | 'suspend' | 'close'

    const approvalMap: Record<string, 'approve' | 'suspended' | 'closed'> = {
      approve: 'approve',
      suspend: 'suspended',
      close: 'closed',
    };

    const updated = await adminService.setEducatorApproval(educatorId, approvalMap[action]);
    if (!updated) return res.status(404).json({ message: 'Educator not found' });

    return res.json({ message: `Educator ${action}d successfully`, educator: updated });
  }
}