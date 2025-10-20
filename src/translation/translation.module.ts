import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TranslationService } from './domain/services/translation.service';
import { QwenMtTranslationService } from './infrastructure/services/qwen-mt-translation.service';
import { TranslationRepository } from './domain/repositories/translation.repository';
import { PrismaTranslationRepository } from './infrastructure/repositories/prisma-translation.repository';
import { TranslateEventListener } from './application/event-listeners/translate.event-listener';
import { GetTranslationsByTargetIdsUseCase } from './application/use-cases/get-translations-by-target-ids.use-case';

@Module({
  imports: [EventEmitterModule],
  providers: [
    {
      provide: TranslationService,
      useClass: QwenMtTranslationService,
    },
    {
      provide: TranslationRepository,
      useClass: PrismaTranslationRepository,
    },
    TranslateEventListener,
    GetTranslationsByTargetIdsUseCase,
  ],
  exports: [GetTranslationsByTargetIdsUseCase],
})
export class TranslationModule {}
