import { Module } from '@nestjs/common';
import { ChatbotService } from './domain/chatbot/chatbot-service.interface';
import { DeepSeekChatbotService } from './infrastructure/chatbot/deepseek.chatbot-service';
import { ConversationRepository } from './domain/repositories/conversation.repository';
import { PrismaConversationRepository } from './infrastructure/repositories/prisma-conversation.repository';
import { MessageRepository } from './domain/repositories/message.repository';
import { PrismaMessageRepository } from './infrastructure/repositories/prisma-message.repository';
import { RetrievedChunkRepository } from './domain/repositories/retrieved-chunk.repository';
import { PrismaRetrievedChunkRepository } from './infrastructure/repositories/prisma-retrieved-chunk.repository';

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
  ],
})
export class ChatModule {}
