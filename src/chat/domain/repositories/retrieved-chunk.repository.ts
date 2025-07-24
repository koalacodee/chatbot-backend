import { RetrievedChunk } from '../entities/retrieved-chunk.entity';

export abstract class RetrievedChunkRepository {
  abstract save(chunk: RetrievedChunk): Promise<RetrievedChunk>;
  abstract findById(id: string): Promise<RetrievedChunk | null>;
  abstract findAll(): Promise<RetrievedChunk[]>;
  abstract removeById(id: string): Promise<RetrievedChunk | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
}
