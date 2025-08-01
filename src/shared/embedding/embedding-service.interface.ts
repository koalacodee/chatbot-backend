export abstract class EmbeddingService {
  abstract embed(content: string): Promise<number[]>;
}
