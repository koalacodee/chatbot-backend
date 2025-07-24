export abstract class ChatbotService {
  abstract ask(knowledge: string, question: string): Promise<string> | string;
}
