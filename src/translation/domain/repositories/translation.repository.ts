import { Translation } from '../entities/translation.entity';
import { SupportedLanguage } from '../services/translation.service';

export abstract class TranslationRepository {
  abstract save(translation: Translation): Promise<Translation>;
  abstract createMany(translations: Translation[]): Promise<Translation[]>;
  abstract findByTargetId(targetId: string): Promise<Translation[]>;
  abstract findByTargetIds(targetIds: string[]): Promise<Translation[]>;
  abstract findByTargetIdAndLang(
    targetId: string,
    lang: SupportedLanguage,
  ): Promise<Translation | null>;
  abstract remove(id: string): Promise<void>;
  abstract removeByTargetId(targetId: string): Promise<void>;
}
