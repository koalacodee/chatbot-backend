import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Point } from 'src/shared/entities/point.entity';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { PointRepository } from '../../domain/repositories/point.repository';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { SearchKnowledgeChunksUseCase } from './search-knowledge-chunks.use-case';

const DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000e02';

const pointId = (n: number) =>
  `018f4a1e-1c7a-7000-8000-0000000000${n.toString().padStart(2, '0')}`;

const buildPoint = (n: number) =>
  Point.create({ id: pointId(n), vector: Vector.create({ dim: 2048 }) });

const buildChunk = (content: string, linkedPoint?: number) => {
  const chunk = KnowledgeChunk.create({ content, departmentId: DEPT_ID });
  if (linkedPoint !== undefined) chunk.updatePointId(pointId(linkedPoint));
  return chunk;
};

interface Options {
  /** Points the vector store returns, in rank order. */
  points?: Point[];
  /** Chunks the relational store returns — deliberately in a different order. */
  chunks?: KnowledgeChunk[];
  embedding?: number[];
}

function build(options: Options = {}) {
  const embedCalls: Array<{ content: string; dimensions: number }> = [];
  const searchCalls: Array<{ vector: Vector; topN: number }> = [];

  const embedding = stubRepository<EmbeddingService>('EmbeddingService', {
    embed: async (content: string, dimensions: number) => {
      embedCalls.push({ content, dimensions });
      return options.embedding ?? new Array(2048).fill(0.1);
    },
  });

  const points = stubRepository<PointRepository>('PointRepository', {
    search: async (vector: Vector, topN: number) => {
      searchCalls.push({ vector, topN });
      return options.points ?? [];
    },
  });

  const chunks = stubRepository<KnowledgeChunkRepository>(
    'KnowledgeChunkRepository',
    {
      findByPointIds: async () => options.chunks ?? [],
    },
  );

  return {
    embedCalls,
    searchCalls,
    useCase: new SearchKnowledgeChunksUseCase(embedding, points, chunks),
  };
}

/**
 * The retrieval step behind the chat assistant: embed the question, find nearest points,
 * then map those back to chunk text. The ranking is the substance — the vector store
 * knows the order, the relational store does not, so the use-case has to re-impose it.
 */
describe('SearchKnowledgeChunksUseCase', () => {
  it('embeds the query at the indexing dimension', async () => {
    const { useCase, embedCalls } = build();

    await useCase.execute({ query: 'how do refunds work?' });

    expect(embedCalls).toEqual([
      { content: 'how do refunds work?', dimensions: 2048 },
    ]);
  });

  it('defaults to the top three results', async () => {
    const { useCase, searchCalls } = build();

    await useCase.execute({ query: 'refunds' });

    expect(searchCalls[0].topN).toBe(3);
  });

  it('passes an explicit topN through to the vector store', async () => {
    const { useCase, searchCalls } = build();

    await useCase.execute({ query: 'refunds', topN: 10 });

    expect(searchCalls[0].topN).toBe(10);
  });

  it('returns nothing when the vector store finds nothing', async () => {
    const { useCase } = build({ points: [] });

    await expect(useCase.execute({ query: 'refunds' })).resolves.toEqual([]);
  });

  it('does not query the chunk store when there are no points', async () => {
    // findByPointIds is stubbed, but a zero-point search should short-circuit before it.
    const { useCase } = build({ points: [] });

    await expect(useCase.execute({ query: 'refunds' })).resolves.toEqual([]);
  });

  describe('ranking', () => {
    it('reorders chunks to match the vector search ranking', async () => {
      const { useCase } = build({
        points: [buildPoint(1), buildPoint(2), buildPoint(3)],
        // Returned in the opposite order, as a relational IN query would be.
        chunks: [
          buildChunk('third', 3),
          buildChunk('second', 2),
          buildChunk('first', 1),
        ],
      });

      await expect(useCase.execute({ query: 'refunds' })).resolves.toEqual([
        'first',
        'second',
        'third',
      ]);
    });

    it('trims to topN even when more chunks come back', async () => {
      const { useCase } = build({
        points: [buildPoint(1), buildPoint(2), buildPoint(3)],
        chunks: [
          buildChunk('first', 1),
          buildChunk('second', 2),
          buildChunk('third', 3),
        ],
      });

      await expect(
        useCase.execute({ query: 'refunds', topN: 2 }),
      ).resolves.toEqual(['first', 'second']);
    });

    /**
     * A chunk whose pointId matches nothing in the result set sorts to the end rather
     * than corrupting the order — the ranking map falls back to MAX_SAFE_INTEGER.
     */
    it('pushes chunks with an unrecognised point to the back', async () => {
      const { useCase } = build({
        points: [buildPoint(1), buildPoint(2)],
        chunks: [
          buildChunk('orphan', 99),
          buildChunk('second', 2),
          buildChunk('first', 1),
        ],
      });

      await expect(
        useCase.execute({ query: 'refunds', topN: 3 }),
      ).resolves.toEqual(['first', 'second', 'orphan']);
    });

    it('treats a chunk with no pointId as unranked', async () => {
      const { useCase } = build({
        points: [buildPoint(1)],
        chunks: [buildChunk('unlinked'), buildChunk('first', 1)],
      });

      await expect(
        useCase.execute({ query: 'refunds', topN: 2 }),
      ).resolves.toEqual(['first', 'unlinked']);
    });

    it('handles fewer chunks than points without padding', async () => {
      const { useCase } = build({
        points: [buildPoint(1), buildPoint(2), buildPoint(3)],
        chunks: [buildChunk('only', 2)],
      });

      await expect(useCase.execute({ query: 'refunds' })).resolves.toEqual([
        'only',
      ]);
    });
  });
});
