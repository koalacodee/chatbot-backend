import { Module } from '@nestjs/common';
import { ChatbotService } from './domain/chatbot/chatbot-service.interface';
import { DeepSeekChatbotService } from './infrastructure/chatbot/deepseek.chatbot-service';
import { ConversationRepository } from './domain/repositories/conversation.repository';
import { PrismaConversationRepository } from './infrastructure/repositories/prisma-conversation.repository';
import { MessageRepository } from './domain/repositories/message.repository';
import { PrismaMessageRepository } from './infrastructure/repositories/prisma-message.repository';
import { RetrievedChunkRepository } from './domain/repositories/retrieved-chunk.repository';
import { PrismaRetrievedChunkRepository } from './infrastructure/repositories/prisma-retrieved-chunk.repository';
import { BullModule } from '@nestjs/bullmq';
import { AskUseCase } from './application/use-cases/ask.use-case';
import { SaveMessageProcessor } from './infrastructure/queues/save-message.processor';
import { SaveMessagesUseCase } from './application/use-cases/save-messages.use-case';
import { AskController } from './interface/http/ask.controller';
import { KnowledgeChunkModule } from 'src/knowledge-chunks/knowledge-chunk.module';

@Module({
  providers: [
    {
      provide: ChatbotService,
      useClass: DeepSeekChatbotService,
    },
    {
      provide: ConversationRepository,
      useClass: PrismaConversationRepository,
    },
    {
      provide: MessageRepository,
      useClass: PrismaMessageRepository,
    },
    {
      provide: RetrievedChunkRepository,
      useClass: PrismaRetrievedChunkRepository,
    },
    AskUseCase,
    SaveMessageProcessor,
    SaveMessagesUseCase,
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
  ],
  controllers: [AskController],
})
export class ChatModule {}
