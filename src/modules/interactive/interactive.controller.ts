import { Request, Response } from 'express';
import { CurriculumService } from '../curriculum/curriculum.service.js';
import { InteractiveService } from './interactive.service.js';

const service = new InteractiveService();
const curriculumService = new CurriculumService(); // used only to verify parent resource exists

export class InteractiveController {
  async create(req: Request, res: Response) {
    const resource = await curriculumService.getResource(req.params.resourceId);
    if (!resource) return res.status(404).json({ message: 'Parent resource not found' });
    const element = await service.create(req.params.resourceId, req.body);
    return res.status(201).json(element);
  }
  async listByResource(req: Request, res: Response) {
    return res.json(await service.listByResource(req.params.resourceId));
  }
  async getById(req: Request, res: Response) {
    const element = await service.getById(req.params.id);
    if (!element) return res.status(404).json({ message: 'Interactive element not found' });
    return res.json(element);
  }
  async update(req: Request, res: Response) {
    const element = await service.update(req.params.id, req.body);
    if (!element) return res.status(404).json({ message: 'Interactive element not found' });
    return res.json(element);
  }
  async delete(req: Request, res: Response) {
    const element = await service.delete(req.params.id);
    if (!element) return res.status(404).json({ message: 'Interactive element not found' });
    return res.status(200).json({ message: 'Interactive element deleted' });
  }
}