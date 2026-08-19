import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../../config/r2.js';

export class FilesService {
  async generateUploadUrl(fileName: string, contentType: string, folder: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 min to complete the PUT

    return { uploadUrl, publicUrl: `${R2_PUBLIC_URL}/${key}`, key };
  }

  async generateBatchUploadUrls(files: { fileName: string; contentType: string }[], folder: string) {
  return Promise.all(files.map((f) => this.generateUploadUrl(f.fileName, f.contentType, folder)));
}
}