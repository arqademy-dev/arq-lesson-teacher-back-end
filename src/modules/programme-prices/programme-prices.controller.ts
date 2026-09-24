import { Request, Response } from 'express';
import { ProgrammePriceService, ProgrammePriceError } from './programme-prices.service.js';
import { uuidSchema, type CreateProgrammePriceBody, type UpdateProgrammePriceBody } from './programme-prices.validation.js';

const service = new ProgrammePriceService();

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof ProgrammePriceError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

export class ProgrammePricesController {
  async listForProgramme(req: Request<{ programmeId: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.programmeId).success) return res.status(400).json({ message: 'Invalid programme id' });
    return res.json(await service.list(req.params.programmeId));
  }

  async create(req: Request, res: Response) {
    try {
      const price = await service.create(req.body as CreateProgrammePriceBody);
      return res.status(201).json(price);
    } catch (err) {
      return fail(err, res, 'Error creating price');
    }
  }

  async update(req: Request<{ id: string }>, res: Response) {
    if (!uuidSchema.safeParse(req.params.id).success) return res.status(400).json({ message: 'Invalid price id' });
    try {
      const price = await service.update(req.params.id, req.body as UpdateProgrammePriceBody);
      if (!price) return res.status(404).json({ message: 'Price not found' });
      return res.json(price);
    } catch (err) {
      return fail(err, res, 'Error updating price');
    }
  }
}