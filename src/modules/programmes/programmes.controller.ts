import { Request, Response } from 'express';
import { ProgrammeService, ProgrammeRuleError } from './programmes.service.js';
import {
  listProgrammesQuerySchema,
  uuidSchema,
  type CreateProgrammeBody,
  type UpdateProgrammeBody,
} from './programmes.validation.js';

const service = new ProgrammeService();

// A malformed id would otherwise reach Postgres and come back as a 500.
const badId = (res: Response) => res.status(400).json({ message: 'Invalid programme id' });

export class ProgrammesController {
  // ---------------- Admin ----------------
  async create(req: Request, res: Response) {
    try {
      const programme = await service.create(req.body as CreateProgrammeBody);
      return res.status(201).json(programme);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error creating programme' });
    }
  }

  async list(req: Request, res: Response) {
    const parsed = listProgrammesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors });
    }
    return res.json(await service.list(parsed.data));
  }

  async getOne(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return badId(res);
    const programme = await service.getById(req.params.id);
    if (!programme) return res.status(404).json({ message: 'Programme not found' });
    return res.json(programme);
  }

  async update(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return badId(res);
    try {
      const programme = await service.update(req.params.id, req.body as UpdateProgrammeBody);
      if (!programme) return res.status(404).json({ message: 'Programme not found' });
      return res.json(programme);
    } catch (err) {
      if (err instanceof ProgrammeRuleError) return res.status(409).json({ message: err.message });
      console.error(err);
      return res.status(500).json({ message: 'Error updating programme' });
    }
  }

  async remove(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return badId(res);
    try {
      const removed = await service.remove(req.params.id);
      if (!removed) return res.status(404).json({ message: 'Programme not found' });
      return res.json({ message: 'Programme deleted' });
    } catch (err) {
      if (err instanceof ProgrammeRuleError) return res.status(409).json({ message: err.message });
      console.error(err);
      return res.status(500).json({ message: 'Error deleting programme' });
    }
  }

  // ---------------- Educator (published only) ----------------
  async listPublished(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
    return res.json(await service.listPublished(search));
  }

  async getPublished(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return badId(res);
    const programme = await service.getPublished(req.params.id);
    if (!programme) return res.status(404).json({ message: 'Programme not found' });
    return res.json(programme);
  }
}