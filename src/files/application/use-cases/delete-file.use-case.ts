import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';

interface DeleteFileInput {
  filename: string;
}

@Injectable()
export class DeleteFileUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute({ filename }: DeleteFileInput) {
    const path = join(
      process.cwd(),
      this.config.get('FILE_STORAGE_PATH'),
      filename,
    );

    await unlink(path);
  }
}
