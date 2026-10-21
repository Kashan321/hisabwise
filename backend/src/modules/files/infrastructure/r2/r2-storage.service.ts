import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../../../config/env';
import { buildObjectKey } from '../file-storage.utils';
import type { FileStorageService, UploadFileInput, UploadFileResult } from '../../domain/file-storage';
import {
  FileStorageNotConfiguredError,
  FileUploadFailedError,
} from '../../domain/errors/file.errors';
import { buildR2PublicUrl, getR2Config } from './r2-config';

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  const config = getR2Config();
  if (!config) throw new FileStorageNotConfiguredError();

  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return r2Client;
}

export class R2StorageService implements FileStorageService {
  async getReadUrl(key: string): Promise<string> {
    const config = getR2Config();
    if (!config) throw new FileStorageNotConfiguredError();

    if (config.publicBaseUrl) {
      return buildR2PublicUrl(key);
    }

    const client = getR2Client();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
      { expiresIn: env.R2_PRESIGN_EXPIRES_SECONDS },
    );
  }

  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const config = getR2Config();
    if (!config) throw new FileStorageNotConfiguredError();

    const key = buildObjectKey(
      input.businessId,
      input.mimeType,
      input.originalName,
      input.folder,
    );

    const client = getR2Client();

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: input.buffer,
          ContentType: input.mimeType,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'R2 upload failed';
      throw new FileUploadFailedError(message);
    }

    const url = await this.getReadUrl(key);

    return {
      key,
      url,
      mimeType: input.mimeType,
      size: input.buffer.length,
      originalName: input.originalName,
    };
  }
}
