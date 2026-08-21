import { Request, Response } from 'express';
import { CurriculumService } from './curriculum.service.js';

const service = new CurriculumService();

export class CurriculumController {
  // Subjects
  async createSubject(req: Request, res: Response) {
    const subject = await service.createSubject(req.body, req.user!.id);
    return res.status(201).json(subject);
  }
  async listSubjects(_req: Request, res: Response) {
    return res.json(await service.listSubjects());
  }
  async getSubject(req: Request<{ id: string }>, res: Response) {
    const subject = await service.getSubject(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    return res.json(subject);
  }
  async updateSubject(req: Request<{ id: string }>, res: Response) {
    const subject = await service.updateSubject(req.params.id, req.body);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    return res.json(subject);
  }
  async deleteSubject(req: Request<{ id: string }>, res: Response) {
    const subject = await service.deleteSubject(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    return res.status(200).json({ message: 'Subject deleted' });
  }

  // Classes
  async createClass(req: Request, res: Response) {
    const cls = await service.createClass(req.body);
    return res.status(201).json(cls);
  }
  async listClasses(req: Request, res: Response) {
    return res.json(await service.listClasses());
  }
  async getClass(req: Request<{ id: string }>, res: Response) {
    const cls = await service.getClass(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    return res.json(cls);
  }
  async updateClass(req: Request<{ id: string }>, res: Response) {
    const cls = await service.updateClass(req.params.id, req.body);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    return res.json(cls);
  }
  async deleteClass(req: Request<{ id: string }>, res: Response) {
    const cls = await service.deleteClass(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    return res.status(200).json({ message: 'Class deleted' });
  }

  // Topics
  async createTopic(req: Request, res: Response) {
    const subject = await service.getSubject(req.body.subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const cls = await service.getClass(req.body.classId);
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    const topic = await service.createTopic(req.body);
    return res.status(201).json(topic);
  }
  async listTopics(req: Request, res: Response) {
    const { subjectId, classId } = req.query as { subjectId?: string; classId?: string };
    return res.json(await service.listTopics({ subjectId, classId }));
  }
  async getTopic(req: Request<{ id: string }>, res: Response) {
    const topic = await service.getTopic(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    return res.json(topic);
  }
  async updateTopic(req: Request<{ id: string }>, res: Response) {
    const topic = await service.updateTopic(req.params.id, req.body);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    return res.json(topic);
  }
  async deleteTopic(req: Request<{ id: string }>, res: Response) {
    const topic = await service.deleteTopic(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    return res.status(200).json({ message: 'Topic deleted' });
  }

  // Resources
  async createResource(req: Request<{ topicId: string }>, res: Response) {
    const topic = await service.getTopic(req.params.topicId);
    if (!topic) return res.status(404).json({ message: 'Parent topic not found' });
    const resource = await service.createResource(req.params.topicId, req.body);
    return res.status(201).json(resource);
  }
  async listResources(req: Request<{ topicId: string }>, res: Response) {
    return res.json(await service.listResourcesByTopic(req.params.topicId));
  }
  async getResource(req: Request<{ id: string }>, res: Response) {
    const resource = await service.getResource(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    return res.json(resource);
  }
  async updateResource(req: Request<{ id: string }>, res: Response) {
    const resource = await service.updateResource(req.params.id, req.body);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    return res.json(resource);
  }
  async deleteResource(req: Request<{ id: string }>, res: Response) {
    const resource = await service.deleteResource(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    return res.status(200).json({ message: 'Resource deleted' });
  }
}
