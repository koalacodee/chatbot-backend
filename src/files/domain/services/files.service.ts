export abstract class FilesService {
  abstract genUploadKey(targetId: string): string | Promise<string>;
  abstract deleteFile(attachmentId: string): void | Promise<void>;
  abstract replaceFile(attachmentId: string): string | Promise<string>;
}
