export class FilehubUploadedEvent {
  constructor(
    public readonly upload: {
      upload_id: string;
      upload_expiry: string; // ISO 8601 format
      file_path?: string;
      original_filename?: string;
      upload_length?: number;
      upload_key: string;
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
