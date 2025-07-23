import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new QdrantClient({
      url: this.config.get('QDRANT_URL') || 'http://localhost:6333',
      apiKey: this.config.get('QDRANT_API_KEY') || undefined,
    });
  }

  getClient(): QdrantClient {
    if (!this.client) {
      this.onModuleInit();
    }
    return this.client;
  }
}
