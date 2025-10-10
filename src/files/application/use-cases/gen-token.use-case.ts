import { Injectable } from '@nestjs/common';
import { FilesService } from 'src/files/domain/services/files.service';

interface GenTokenInput {
  targetId: string;
  userId?: string;
  guestId?: string;
}

@Injectable()
export class GenTokenUseCase {
  constructor(private readonly fileService: FilesService) {}

  async execute({ targetId, userId, guestId }: GenTokenInput) {
    return this.fileService.genUploadKey(targetId, userId, guestId);
  }
}
