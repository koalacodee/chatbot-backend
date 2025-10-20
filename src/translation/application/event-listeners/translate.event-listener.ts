import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TranslationService,
  SupportedLanguage,
} from '../../domain/services/translation.service';
import { TranslationRepository } from '../../domain/repositories/translation.repository';
import { TranslateEvent } from '../../domain/events/translate.event';
import { Translation } from '../../domain/entities/translation.entity';

@Injectable()
export class TranslateEventListener {
  constructor(
    private readonly translationService: TranslationService,
    private readonly translationRepository: TranslationRepository,
  ) {}

  @OnEvent(TranslateEvent.name)
  async handleTranslateEvent(event: TranslateEvent): Promise<void> {
    try {
      const translations: Translation[] = [];
      const promises: Promise<void>[] = [];

      // Process each target language
      for (const targetLang of event.targetLanguages) {
        promises.push(
          (async (): Promise<void> => {
            try {
              // Check if translation already exists
              const existingTranslation =
                await this.translationRepository.findByTargetIdAndLang(
                  event.targetId,
                  targetLang,
                );

              if (existingTranslation) {
                console.log(
                  `Translation already exists for targetId: ${event.targetId}, lang: ${targetLang}`,
                );
                return;
              }

              // Translate the content
              const translatedContent = await this.translationService.translate(
                event.content,
                targetLang as SupportedLanguage,
              );

              // Create translation entity
              const translation = Translation.create({
                content: translatedContent,
                lang: targetLang,
                targetId: event.targetId,
                subTarget: event.subTarget,
              });

              translations.push(translation);
            } catch (error) {
              console.error(`Failed to translate to ${targetLang}:`, error);
              // Continue with other languages even if one fails
            }
          })(),
        );
      }

      await Promise.all(promises);

      if (translations.length > 0) {
        await this.translationRepository.createMany(translations);
        console.log(
          `Created ${translations.length} translations for targetId: ${event.targetId}`,
        );
      }
    } catch (error) {
      console.error('Error handling translate event:', error);
    }
  }
}
