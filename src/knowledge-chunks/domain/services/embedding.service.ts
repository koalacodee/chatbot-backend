export abstract class EmbeddingService {
  abstract embed(content: string, dimensions: number): Promise<number[]>;
}
