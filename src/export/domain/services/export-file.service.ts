import { ReadStream } from 'fs';

export interface ExportFileStreamResult {
  stream: ReadStream | NodeJS.ReadableStream | null;
  exportId: string;
  objectName: string;
}

export interface ExportShareKeyResult {
  shareKey: string;
  expiresAt: Date | null;
}

export abstract class ExportFileService {
  abstract genShareKey(
    exportId: string,
    expiresIn?: number,
  ): Promise<ExportShareKeyResult>;

  abstract getFileStream(identifier: string): Promise<ExportFileStreamResult>;

  abstract getSignedUrl(identifier: string): Promise<string | null>;
}


