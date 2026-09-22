import { Request, Response } from 'express';
import { ProgrammeTopicService, ProgrammeTopicError } from './programme-topics.service.js';
import {
  availableTopicsQuerySchema,
  uuidSchema,
  type AddProgrammeTopicBody,
  type ReorderTopicsBody,
} from './programme-topics.validation.js';

const service = new ProgrammeTopicService();

const invalidId = (res: Response) => res.status(400).json({ message: 'Invalid id' });

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof ProgrammeTopicError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

type P = Request<{ programmeId: string }>;
type PT = Request<{ programmeId: string; topicId: string }>;

export class ProgrammeTopicsController {
  async list(req: P, res: Response) {
    if (!uuidSchema.safeParse(req.params.programmeId).success) return invalidId(res);
    try {
      return res.json(await service.listTopics(req.params.programmeId));
    } catch (err) {
      return fail(err, res, 'Error loading programme topics');
    }
  }

  async available(req: P, res: Response) {
    if (!uuidSchema.safeParse(req.params.programmeId).success) return invalidId(res);
    const query = availableTopicsQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ message: 'Invalid query' });
    try {
      return res.json(await service.availableTopics(req.params.programmeId, query.data.subjectId));
    } catch (err) {
      return fail(err, res, 'Error loading available topics');
    }
  }

  // Returns the programme's full ordered list, ready to replace UI state.
  async add(req: P, res: Response) {
    if (!uuidSchema.safeParse(req.params.programmeId).success) return invalidId(res);
    const body = req.body as AddProgrammeTopicBody;
    try {
      const list =
        'topicId' in body
          ? await service.addExisting(req.params.programmeId, body.topicId)
          : await service.createAndAttach(req.params.programmeId, body);
      return res.status(201).json(list);
    } catch (err) {
      return fail(err, res, 'Error adding topic to programme');
    }
  }

  async reorder(req: P, res: Response) {
    if (!uuidSchema.safeParse(req.params.programmeId).success) return invalidId(res);
    try {
      const { topicIds } = req.body as ReorderTopicsBody;
      return res.json(await service.reorder(req.params.programmeId, topicIds));
    } catch (err) {
      return fail(err, res, 'Error reordering topics');
    }
  }

  async remove(req: PT, res: Response) {
    if (!uuidSchema.safeParse(req.params.programmeId).success) return invalidId(res);
    if (!uuidSchema.safeParse(req.params.topicId).success) return invalidId(res);
    try {
      return res.json(await service.removeTopic(req.params.programmeId, req.params.topicId));
    } catch (err) {
      return fail(err, res, 'Error removing topic from programme');
    }
  }
}