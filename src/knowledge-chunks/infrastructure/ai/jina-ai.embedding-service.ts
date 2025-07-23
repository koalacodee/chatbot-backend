import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';

export interface EmbeddingResponse {
  model: string;
  object: 'list';
  usage: {
    total_tokens: number;
  };
  data: EmbeddingItem[];
}

export interface EmbeddingItem {
  object: 'embedding';
  index: number;
  embedding: number[];
}

@Injectable()
export class JinaAiEmbeddingService extends EmbeddingService {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async generateEmbedding(content: string): Promise<number[]> {
    const data = {
      model: 'jina-embeddings-v4',
      task: 'text-matching',
      input: [{ text: content }],
    };

    return axios
      .post<EmbeddingResponse>('https://api.jina.ai/v1/embeddings', data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.get('JINA_API_KEY')}`,
        },
      })
      .then((response) => {
        return response.data.data[0].embedding;
      });
  }
}
