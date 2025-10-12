import { FastifyReply, FastifyRequest } from 'fastify';
import { ReadStream } from 'fs';

export abstract class FileManagementClass {
  abstract uploadSingle(req: FastifyRequest, res: FastifyReply): Promise<any>;
  abstract uploadMultiple(req: FastifyRequest, res: FastifyReply): Promise<any>;
  abstract genShareKey(
    attachmentId: string,
    expiresIn: number,
  ): Promise<string>;
  abstract getFileStream(shareKeyOrId: string): Promise<ReadStream | null>;
  abstract getSignedUrl(shareKeyOrId: string): Promise<string | null>;

  abstract deleteFile(filename: string): Promise<void>;
  abstract deleteMultipleFiles(filenames: string[]): Promise<void>;
  abstract deleteByTargetId(targetId: string): Promise<void>;
  abstract deleteByUserId(userId: string): Promise<void>;
  abstract deleteByGuestId(guestId: string): Promise<void>;
}
