export interface Upload {
  uploadKey: string;
  uploadExpiry: Date;
}

export interface SignedUrl {
  signedUrl: string;
  expirationDate: Date;
}

export interface SignedUrlBatch {
  filename: string;
  signedUrl: string;
  expirationDate: Date;
}

export interface WebhookDataFull {
  event: 'tus_completed';
  upload: {
    uploadId: string;
    uploadExpiry: string; // ISO 8601 format
    filePath?: string;
    originalFilename?: string;
    uploadLength?: number;
    uploadKey: string;
  };
  metadata?: {
    expiration?: string;
    isGlobal?: '0' | '1';
    originalFilename?: string;
    uploadKey?: string;
  };
  timestamp: string; // ISO 8601 format
}

export interface WebhookDataBasic {
  event: 'upload_completed';
  timestamp: string; // ISO 8601 format
  objectPath: string;
  size: number;
}

export interface SignedPutUrl {
  filename: string;
  signedUrl: string;
  expirationDate: Date;
}

export type WebhookData = WebhookDataFull | WebhookDataBasic;

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
  abstract getSignedPutUrl(
    expiresInSeconds: number,
    fileExtension: string,
  ): Promise<SignedPutUrl>;
}
