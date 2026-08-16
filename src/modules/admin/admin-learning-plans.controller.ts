import { Request, Response } from 'express';
import { LearningPlanService } from '../learning-plans/learning-plans.service.js';

const learningPlanService = new LearningPlanService();

export class AdminLearningPlansController {
  async updatePlan(req: Request<{ id: string }>, res: Response) {
    try {
      const updated = await learningPlanService.updatePlan(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Learning plan not found' });

      const fullPlan = await learningPlanService.getPlanWithSchedule(req.params.id);
      return res.json(fullPlan);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error updating learning plan by admin' });
    }
  }

  async updateSession(req: Request<{ sessionId: string }>, res: Response) {
    try {
      const result = await learningPlanService.getSessionWithPlan(req.params.sessionId);
      if (!result) return res.status(404).json({ message: 'Session not found' });

      const updated = await learningPlanService.updateSession(req.params.sessionId, req.body);
      return res.json({ message: 'Session updated', session: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error updating session by admin' });
    }
  }
}
