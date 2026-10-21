import { buildObjectKey } from '../file-storage.utils';
import type { FileStorageService, UploadFileInput, UploadFileResult } from '../../domain/file-storage';
import COS from 'cos-nodejs-sdk-v5';
import { buildPublicUrl, getCosConfig } from './cos-config';
import {
  FileStorageNotConfiguredError,
  FileUploadFailedError,
} from '../../domain/errors/file.errors';

let cosClient: COS | null = null;

function getCosClient(): COS {
  const config = getCosConfig();
  if (!config) throw new FileStorageNotConfiguredError();

  if (!cosClient) {
    cosClient = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
  }

  return cosClient;
}

export class CosStorageService implements FileStorageService {
  async getReadUrl(key: string): Promise<string> {
    return buildPublicUrl(key);
  }

  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const config = getCosConfig();
    if (!config) throw new FileStorageNotConfiguredError();

    const key = buildObjectKey(
      input.businessId,
      input.mimeType,
      input.originalName,
      input.folder,
    );

    const client = getCosClient();

    await new Promise<void>((resolve, reject) => {
      client.putObject(
        {
          Bucket: config.bucket,
          Region: config.region,
          Key: key,
          Body: input.buffer,
          ContentType: input.mimeType,
        },
        (error) => {
          if (error) {
            reject(new FileUploadFailedError(error.message));
            return;
          }
          resolve();
        },
      );
    });

    return {
      key,
      url: await this.getReadUrl(key),
      mimeType: input.mimeType,
      size: input.buffer.length,
      originalName: input.originalName,
    };
  }
}
