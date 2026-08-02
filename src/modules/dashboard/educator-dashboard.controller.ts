// educator-dashboard.controller.ts
import { Request, Response } from 'express';
import { EducatorDashboardService } from './educator-dashboard.service.js';
const service = new EducatorDashboardService();
export class EducatorDashboardController {
  async getSummary(req: Request, res: Response) {
    return res.json(await service.getSummary(req.educatorProfile!.id));
  }
}