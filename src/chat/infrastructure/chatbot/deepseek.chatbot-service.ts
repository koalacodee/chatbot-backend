import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from 'src/chat/domain/chatbot/chatbot-service.interface';
import { OpenAI } from 'openai';

@Injectable()
export class DeepSeekChatbotService extends ChatbotService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    super();

    this.client = new OpenAI({
      baseURL: config.get('HF_BASE_URL'),
      apiKey: config.get('HF_TOKEN'),
    });
  }

  async ask(knowledge: string, question: string): Promise<string> {
    try {
      const chatCompletion = await this.client.chat.completions.create({
        model: 'deepseek-ai/DeepSeek-V3:novita',
        messages: [
          {
            role: 'system',
            content: `Use the following context to answer. Respond in the same language as the question:\n\n${knowledge}`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });

      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.error('Error in DeepSeekChatbotService.ask:', error);
      throw new Error('Failed to generate answer from DeepSeek');
    }
  }
}
