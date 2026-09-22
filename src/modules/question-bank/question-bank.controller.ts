import { Request, Response } from 'express';
import { QuestionBankService, QuestionBankError } from './question-bank.service.js';
import {
  coverageQuerySchema,
  listQuestionsQuerySchema,
  uuidSchema,
  type CreateQuestionBody,
  type UpdateQuestionBody,
} from './question-bank.validation.js';

const service = new QuestionBankService();

const invalidId = (res: Response) => res.status(400).json({ message: 'Invalid question id' });

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof QuestionBankError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

export class QuestionBankController {
  async create(req: Request, res: Response) {
    try {
      const question = await service.create(req.body as CreateQuestionBody);
      return res.status(201).json(question);
    } catch (err) {
      return fail(err, res, 'Error creating question');
    }
  }

  async bulkCreate(req: Request, res: Response) {
    try {
      const result = await service.bulkCreate((req.body as { questions: CreateQuestionBody[] }).questions);
      return res.status(201).json(result); // { created: n }
    } catch (err) {
      return fail(err, res, 'Error importing questions');
    }
  }

  async list(req: Request, res: Response) {
    const parsed = listQuestionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors });
    }
    try {
      return res.json(await service.list(parsed.data)); // { items, total, limit, offset }
    } catch (err) {
      return fail(err, res, 'Error loading questions');
    }
  }

  // Active questions per topic of a programme, in sequence order.
  async coverage(req: Request, res: Response) {
    const parsed = coverageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'programmeId (uuid) is required' });
    }
    try {
      return res.json(await service.coverage(parsed.data.programmeId));
    } catch (err) {
      return fail(err, res, 'Error loading coverage');
    }
  }

  async getOne(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return invalidId(res);
    try {
      const question = await service.getById(req.params.id);
      if (!question) return res.status(404).json({ message: 'Question not found' });
      return res.json(question);
    } catch (err) {
      return fail(err, res, 'Error loading question');
    }
  }

  // Also moves a question to another topic (send topicId) and restores an archived one (isActive: true).
  async update(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return invalidId(res);
    try {
      const question = await service.update(req.params.id, req.body as UpdateQuestionBody);
      if (!question) return res.status(404).json({ message: 'Question not found' });
      return res.json(question);
    } catch (err) {
      return fail(err, res, 'Error updating question');
    }
  }

  // "Delete" archives the question. It stays in the database for quiz history.
  async archive(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return invalidId(res);
    try {
      const question = await service.archive(req.params.id);
      if (!question) return res.status(404).json({ message: 'Question not found' });
      return res.json({ message: 'Question archived', question });
    } catch (err) {
      return fail(err, res, 'Error archiving question');
    }
  }
}