import { Request, Response } from 'express';
import { FilesService } from './files.service.js';

const filesService = new FilesService();

export class FilesController {
  async getPresignedUrl(req: Request, res: Response) {
    const { fileName, contentType, folder } = req.body;
    try {
      const result = await filesService.generateUploadUrl(fileName, contentType, folder);
      return res.status(200).json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error generating upload URL' });
    }
  }
}