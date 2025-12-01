export class FilehubUploadedEvent {
  constructor(
    public readonly upload: {
      uploadId: string;
      uploadExpiry: string; // ISO 8601 format
      filePath?: string;
      originalFilename?: string;
      uploadLength?: number;
      uploadKey: string;
    },
    public readonly metadata: {
      expiration?: string;
      isGlobal?: '0' | '1';
      originalFilename?: string;
      uploadKey?: string;
    } = {},
    public readonly timestamp: string, // ISO 8601 format
  ) {}
}
