import { Request, Response } from 'express';
import { AdminDashboardService } from './admin-dashboard.service.js';

const service = new AdminDashboardService();
export class AdminDashboardController {
  async getSummary(req: Request, res: Response) {
    return res.json(await service.getSummary());
  }
}