import { Module } from '@nestjs/common';
import { ConversationRepository } from './domain/repositories/conversation.repository';
import { DrizzleConversationRepository } from './infrastructure/repositories/drizzle-conversation.repository';
import { MessageRepository } from './domain/repositories/message.repository';
import { DrizzleMessageRepository } from './infrastructure/repositories/drizzle-message.repository';
import { RetrievedChunkRepository } from './domain/repositories/retrieved-chunk.repository';
import { DrizzleRetrievedChunkRepository } from './infrastructure/repositories/drizzle-retrieved-chunk.repository';
import { BullModule } from '@nestjs/bullmq';
import { SaveMessageProcessor } from './infrastructure/queues/save-message.processor';
import { SaveMessagesUseCase } from './application/use-cases/save-messages.use-case';
import { AskController } from './interface/http/chat.controller';
import { KnowledgeChunkModule } from 'src/knowledge-chunks/knowledge-chunk.module';
import { GetAllConversationsUseCase } from './application/use-cases/get-all-conversations.use-case';
import { GetConversationUseCase } from './application/use-cases/get-conversation.use-case';
import { QuestionModule } from 'src/questions/question.module';
import { GuestModule } from 'src/guest/guest.module';
import { ChatUseCase } from './application/use-cases/chat.use-case';
import { KimiLLMService } from './infrastructure/services/kimi-llm.service';
import { LLMService } from './domain/services/llm.service';

@Module({
  providers: [
    {
      provide: ConversationRepository,
      useClass: DrizzleConversationRepository,
    },
    {
      provide: MessageRepository,
      useClass: DrizzleMessageRepository,
    },
    {
      provide: RetrievedChunkRepository,
      useClass: DrizzleRetrievedChunkRepository,
    },
    {
      provide: LLMService,
      useClass: KimiLLMService,
    },
    SaveMessageProcessor,
    SaveMessagesUseCase,
    GetAllConversationsUseCase,
    GetConversationUseCase,
    ChatUseCase,
  ],
  imports: [
    BullModule.registerQueue({
      name: 'chat',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    KnowledgeChunkModule,
    QuestionModule,
  ],
  controllers: [AskController],
})
export class ChatModule {}
