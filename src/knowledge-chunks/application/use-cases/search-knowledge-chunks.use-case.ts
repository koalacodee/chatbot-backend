import { Injectable } from '@nestjs/common';
import { EmbeddingService } from 'src/knowledge-chunks/domain/services/embedding.service';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { KnowledgeChunkRepository } from 'src/knowledge-chunks/domain/repositories/knowledge-chunk.repository';
import { Vector } from 'src/shared/value-objects/vector.vo';

interface SearchKnowledgeChunksInput {
  query: string;
  topN?: number;
}

@Injectable()
export class SearchKnowledgeChunksUseCase {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly pointRepository: PointRepository,
    private readonly knowledgeChunkRepository: KnowledgeChunkRepository,
  ) {}

  async execute(input: SearchKnowledgeChunksInput): Promise<string[]> {
    const { query, topN = 3 } = input;

    // 1) Embed the query text (use same dimensions as indexing pipeline)
    const embedding = await this.embeddingService.embed(query, 2048);
    const queryVector = Vector.create({
      vector: embedding,
      dim: embedding.length as 2048,
    });

    // 2) Search vector database for nearest points
    const points = await this.pointRepository.search(queryVector, topN);

    if (!points.length) return [];

    // 3) Map points to knowledge chunks via pointId
    const pointIds = points.map((p) => p.id.value);
    const chunks = await this.knowledgeChunkRepository.findByPointIds(pointIds);

    // 4) Preserve search order by point ranking
    const rankByPointId = new Map<string, number>();
    pointIds.forEach((id, index) => rankByPointId.set(id, index));

    const orderedContents = chunks
      .sort((a, b) => {
        const ra =
          rankByPointId.get(a.pointId || '') ?? Number.MAX_SAFE_INTEGER;
        const rb =
          rankByPointId.get(b.pointId || '') ?? Number.MAX_SAFE_INTEGER;
        return ra - rb;
      })
      .map((chunk) => chunk.content);

    return orderedContents.slice(0, topN);
  }
}
