import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingService } from 'src/knowledge-chunks/domain/services/embedding.service';

@Injectable()
export class QwenEmbeddingService implements EmbeddingService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('DASHSCOPE_API_KEY'),
      baseURL: this.config.get('QWEN_EMBEDDING_API_URL'),
    });
  }

  async embed(content: string, dimensions: number): Promise<number[]> {
    const response = (await this.client.embeddings.create({
      model: this.config.getOrThrow('QWEN_EMBEDDING_MODEL_ID'),
      input: [content],
      dimensions,
    })) as any;

    return response.data[0].embedding;
  }
}
