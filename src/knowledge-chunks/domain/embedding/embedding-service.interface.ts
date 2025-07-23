export abstract class EmbeddingService {
  abstract generateEmbedding(content: string): Promise<number[]> | number[];
}
