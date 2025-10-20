import { Injectable } from '@nestjs/common';
import { Translation } from 'src/translation/domain/entities/translation.entity';
import { TranslationRepository } from 'src/translation/domain/repositories/translation.repository';

@Injectable()
export class GetTranslationsByTargetIdsUseCase {
  constructor(private readonly translationRepository: TranslationRepository) {}

  async execute(targetIds: string[]): Promise<Translation[]> {
    const translations =
      await this.translationRepository.findByTargetIds(targetIds);
    return translations;
  }
}
