export interface Upload {
  upload_key: string;
  upload_expiry: Date;
}

export interface SignedUrl {
  signed_url: string;
  expiration_date: Date;
}

export interface SignedUrlBatch {
  filename: string;
  signedUrl: string;
  expirationDate: Date;
}

export interface WebhookData {
  event: string;
  upload: {
    upload_id: string;
    upload_expiry: string; // ISO 8601 format
    file_path?: string;
    original_filename?: string;
    upload_length?: number;
    upload_key: string;
  };
  metadata?: {
    expiration?: string;
    isGlobal?: '0' | '1';
    originalFilename?: string;
    uploadKey?: string;
  };
  timestamp: string; // ISO 8601 format
}

export abstract class FileHubService {
  abstract generateUploadToken(options: {
    expiresInMs: number;
    targetId?: string;
    userId?: string;
    guestId?: string;
  }): Promise<Upload>;
  abstract getSignedUrl(
    objectName: string,
    expiresInMs?: number,
  ): Promise<SignedUrl>;
  abstract getSignedUrlBatch(
    fileNames: string[],
    expiresInMs?: number,
  ): Promise<SignedUrlBatch[]>;
}
