import { Message } from '../entities/message.entity';

export abstract class LLMService {
  // abstract chat(messages: Message[]): Promise<string>;
  abstract chatStream(messages: Message[]): AsyncGenerator<string>;
}
