import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from 'src/chat/domain/chatbot/chatbot-service.interface';
import { OpenAI } from 'openai';
import { RetrievedChunk } from 'src/chat/domain/entities/retrieved-chunk.entity';
import { Message } from 'src/chat/domain/entities/message.entity';
import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';

@Injectable()
export class DeepSeekChatbotService extends ChatbotService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    super();

    this.client = new OpenAI({
      baseURL: config.get('CHATBOT_API_URL'),
      apiKey: config.get('HF_TOKEN'),
    });
  }

  async ask(
    knowledge: KnowledgeChunk[], // Current chunks (required)
    question: string, // Current question (required)
    pastChunks?: RetrievedChunk[], // Optional past chunks
    pastMessages?: Message[], // Optional past messages
  ): Promise<string> {
    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      // Combine current and past chunks if available
      // Combine KnowledgeChunk[] and RetrievedChunk[] into a single array of KnowledgeChunk
      const allChunks: KnowledgeChunk[] = [
        ...knowledge,
        ...(pastChunks ? pastChunks.map((rc) => rc.knowledgeChunk) : []),
      ];
      const knowledgeContent = allChunks
        .map((chunk) => chunk.content)
        .join('\n\n');

      messages.push({
        role: 'system',
        content: `Use the following context to answer. Respond in the same language as the question:\n\n${knowledgeContent}`,
      });

      // Handle past messages if provided
      if (pastMessages) {
        pastMessages.forEach((msg) => {
          messages.push({
            role: msg.role.toLowerCase() as 'user' | 'assistant',
            content: msg.content,
          });
        });
      }

      // Add current question
      messages.push({
        role: 'user',
        content: question,
      });

      const chatCompletion = await this.client.chat.completions.create({
        model: this.config.getOrThrow('CHATBOT_MODEL_ID'),
        messages,
      });

      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.error('Error in DeepSeekChatbotService.ask:', error);
      throw new Error('Failed to generate answer from DeepSeek');
    }
  }
}
