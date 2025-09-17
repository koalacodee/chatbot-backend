export abstract class FilesService {
  abstract genUploadKey(targetId: string): Promise<string>;
  abstract deleteFile(attachmentId: string): void | Promise<void>;
  abstract replaceFile(attachmentId: string): string | Promise<string>;
  abstract deleteFilesByTargetId(targetId: string): Promise<void>;
  abstract replaceFilesByTargetId(targetId: string): Promise<string>;
}
