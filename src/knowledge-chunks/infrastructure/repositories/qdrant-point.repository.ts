import { Injectable } from '@nestjs/common';
import { PointRepository } from '../../domain/repositories/point.repository';
import { Point } from '../../domain/entities/point.entity';
import { Vector } from '../../domain/value-objects/vector.vo';
import { QdrantService } from '../../../common/qdrant/qdrant.service';

const QDRANT_COLLECTION = 'points';

@Injectable()
export class QdrantPointRepository extends PointRepository {
  constructor(private readonly qdrantService: QdrantService) {
    super();
  }

  private get client() {
    return this.qdrantService.getClient();
  }

  async save(point: Point): Promise<Point> {
    await this.ensureCollection(point.vector.dim);
    await this.client.upsert(QDRANT_COLLECTION, {
      points: [
        {
          id: point.id.value,
          vector: point.vector.value,
          payload: { 
            dim: point.vector.dim,
            knowledgeChunkId: point.knowledgeChunkId.value
          },
        },
      ],
    });
    return point;
  }

  async saveMany(points: Point[]): Promise<Point[]> {
    if (points.length === 0) return [];
    await this.ensureCollection(points[0].vector.dim);
    await this.client.upsert(QDRANT_COLLECTION, {
      points: points.map((point) => ({
        id: point.id.value,
        vector: point.vector.value,
        payload: { 
          dim: point.vector.dim,
          knowledgeChunkId: point.knowledgeChunkId.value
        },
      })),
    });
    return points;
  }

  async findById(id: string): Promise<Point | null> {
    const result = await this.client.retrieve(QDRANT_COLLECTION, {
      ids: [id],
      with_payload: true,
    });
    const point = result?.[0];
    if (!point) return null;
    return Point.create({
      id: point.id as string,
      vector: Vector.create({
        vector: point.vector as number[],
        dim: point.payload.dim as any,
      }),
      knowledgeChunkId: point.payload.knowledgeChunkId as string,
    });
  }

  async findByIds(ids: string[]): Promise<Point[]> {
    if (ids.length === 0) return [];
    const result = await this.client.retrieve(QDRANT_COLLECTION, {
      ids,
      with_payload: true,
    });
    return (result || []).map((point) =>
      Point.create({
        id: point.id as string,
        vector: Vector.create({
          vector: point.vector as number[],
          dim: point.payload.dim as any,
        }),
        knowledgeChunkId: point.payload.knowledgeChunkId as string,
      }),
    );
  }

  async findByKnowledgeChunkId(knowledgeChunkId: string): Promise<Point[]> {
    const result = await this.client.scroll(QDRANT_COLLECTION, {
      with_payload: true,
      with_vector: true,
      filter: {
        must: [
          {
            key: 'knowledgeChunkId',
            match: {
              value: knowledgeChunkId,
            },
          },
        ],
      },
    });
    return (result?.points || []).map((point) =>
      Point.create({
        id: point.id as string,
        vector: Vector.create({
          vector: point.vector as number[],
          dim: point.payload.dim as any,
        }),
        knowledgeChunkId: point.payload.knowledgeChunkId as string,
      }),
    );
  }

  async findAll(offset?: number, limit?: number): Promise<Point[]> {
    const result = await this.client.scroll(QDRANT_COLLECTION, {
      with_payload: true,
      with_vector: true,
      limit,
      offset,
    });
    return (result?.points || []).map((point) =>
      Point.create({
        id: point.id as string,
        vector: Vector.create({
          vector: point.vector as number[],
          dim: point.payload.dim as any,
        }),
        knowledgeChunkId: point.payload.knowledgeChunkId as string,
      }),
    );
  }

  async removeById(id: string): Promise<Point | null> {
    const found = await this.findById(id);
    if (found) {
      await this.client.delete(QDRANT_COLLECTION, { points: [id] });
    }
    return found;
  }

  async removeByIds(ids: string[]): Promise<Point[]> {
    if (ids.length === 0) return [];
    const found = await this.findByIds(ids);
    if (found.length > 0) {
      await this.client.delete(QDRANT_COLLECTION, { points: ids });
    }
    return found;
  }

  async search(
    vector: Vector,
    limit: number,
    minScore?: number,
  ): Promise<Point[]> {
    const result = await this.client.search(QDRANT_COLLECTION, {
      vector: vector.value,
      limit,
      with_payload: true,
      score_threshold: minScore,
    });
    return result.map((point) =>
      Point.create({
        id: point.id as string,
        vector: Vector.create({
          vector: point.vector as number[],
          dim: point.payload.dim as any,
        }),
        knowledgeChunkId: point.payload.knowledgeChunkId as string,
      }),
    );
  }

  async count(): Promise<number> {
    const collection = await this.client.getCollection(QDRANT_COLLECTION);
    return collection?.points_count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const point = await this.findById(id);
    return !!point;
  }

  async update(id: string, update: Partial<Point>): Promise<Point> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Point with id ${id} not found`);
    }
    
    const updatedVector = update.vector ?? existing.vector;
    const updatedKnowledgeChunkId = update.knowledgeChunkId ?? existing.knowledgeChunkId;

    const updatedPoint = Point.create({
      id: existing.id.value,
      vector: updatedVector,
      knowledgeChunkId: updatedKnowledgeChunkId.value,
    });

    await this.save(updatedPoint);
    return updatedPoint;
  }

  private async ensureCollection(dim: number) {
    try {
      await this.client.getCollection(QDRANT_COLLECTION);
    } catch {
      await this.client.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: dim,
          distance: 'Cosine',
        },
      });
    }
  }
}