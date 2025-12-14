import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';

export abstract class KnowledgeChunkRepository {
  abstract save(chunk: KnowledgeChunk): Promise<KnowledgeChunk>;
  abstract findById(id: string): Promise<KnowledgeChunk | null>;
  abstract findAll(): Promise<KnowledgeChunk[]>;
  abstract removeById(id: string): Promise<KnowledgeChunk | null>;
  abstract findByIds(ids: string[]): Promise<KnowledgeChunk[]>;
  abstract update(
    id: string,
    update: Partial<KnowledgeChunk>,
  ): Promise<KnowledgeChunk>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByDepartmentId(departmentId: string): Promise<KnowledgeChunk[]>;
  abstract findByPointIds(pointIds: string[]): Promise<KnowledgeChunk[]>;
  abstract findAllGroupedByDepartment(): Promise<
    { departmentId: string; knowledgeChunks: KnowledgeChunk[] }[]
  >;
}
