export interface UploadFileInput {
  businessId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  folder?: string;
}

export interface UploadFileResult {
  key: string;
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
}

export interface FileStorageService {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  getReadUrl(key: string): Promise<string>;
}
