import { Injectable } from '@nestjs/common';
import { FilesService } from 'src/files/domain/services/files.service';

interface GenTokenInput {
  targetId: string;
}

@Injectable()
export class GenTokenUseCase {
  constructor(private readonly fileService: FilesService) {}

  async execute({ targetId }: GenTokenInput) {
    return this.fileService.genUploadKey(targetId);
  }
}
