import { Injectable } from '@nestjs/common';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { Point } from '../../../shared/entities/point.entity';
import { Vector } from '../../../shared/value-objects/vector.vo';
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

  async save(point: Point, collection?: string): Promise<Point> {
    await this.ensureCollection(point.vector.dim, collection);
    await this.client.upsert(collection ?? QDRANT_COLLECTION, {
      points: [
        {
          id: point.id.value,
          vector: point.vector.value,
          payload: {
            dim: point.vector.dim,
          },
        },
      ],
    });
    return point;
  }

  async saveMany(points: Point[], collection?: string): Promise<Point[]> {
    if (points.length === 0) return [];
    await this.ensureCollection(points[0].vector.dim, collection);
    await this.client.upsert(collection ?? QDRANT_COLLECTION, {
      points: points.map((point) => ({
        id: point.id.value,
        vector: point.vector.value,
        payload: {
          dim: point.vector.dim,
        },
      })),
    });
    return points;
  }

  async findById(id: string, collection?: string): Promise<Point | null> {
    const result = await this.client.retrieve(collection ?? QDRANT_COLLECTION, {
      ids: [id],
      with_payload: true,
      with_vector: true,
    });
    const point = result?.[0];
    if (!point) return null;
    return Point.create({
      id: point.id as string,
      vector: Vector.create({
        vector: point.vector as number[],
        dim: point.payload.dim as any,
      }),
    });
  }

  async findByIds(ids: string[], collection?: string): Promise<Point[]> {
    if (ids.length === 0) return [];
    const result = await this.client.retrieve(collection ?? QDRANT_COLLECTION, {
      ids,
      with_payload: true,
      with_vector: true,
    });
    return (result || []).map((point) =>
      Point.create({
        id: point.id as string,
        vector: Vector.create({
          vector: point.vector as number[],
          dim: point.payload.dim as any,
        }),
      }),
    );
  }

  async findAll(
    offset?: number,
    limit?: number,
    collection?: string,
  ): Promise<Point[]> {
    const result = await this.client.scroll(collection ?? QDRANT_COLLECTION, {
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
      }),
    );
  }

  async removeById(id: string, collection?: string): Promise<Point | null> {
    const found = await this.findById(id, collection);
    if (found) {
      await this.client.delete(collection ?? QDRANT_COLLECTION, {
        points: [id],
      });
    }
    return found;
  }

  async removeByIds(ids: string[], collection?: string): Promise<Point[]> {
    if (ids.length === 0) return [];
    const found = await this.findByIds(ids, collection);
    if (found.length > 0) {
      await this.client.delete(collection ?? QDRANT_COLLECTION, {
        points: ids,
      });
    }
    return found;
  }

  async search(
    vector: Vector,
    limit: number,
    minScore?: number,
    collection?: string,
    ids?: string[],
  ): Promise<Point[]> {
    const result = await this.client.search(collection ?? QDRANT_COLLECTION, {
      vector: vector.value,
      limit,
      with_payload: true,
      score_threshold: minScore,
      filter:
        ids && ids.length > 0
          ? {
              must: [
                {
                  has_id: ids,
                },
              ],
            }
          : undefined,
    });
    return result.map((point) =>
      Point.create({
        id: point.id as string,
        vector: Vector.create({
          vector: point.vector as number[],
          dim: point.payload.dim as any,
        }),
      }),
    );
  }

  async count(collection?: string): Promise<number> {
    const collectionInfo = await this.client.getCollection(
      collection ?? QDRANT_COLLECTION,
    );
    return collectionInfo?.points_count ?? 0;
  }

  async exists(id: string, collection?: string): Promise<boolean> {
    const point = await this.findById(id, collection);
    return !!point;
  }

  async update(
    id: string,
    update: Partial<Point>,
    collection?: string,
  ): Promise<Point> {
    const existing = await this.findById(id, collection);
    if (!existing) {
      throw new Error(`Point with id ${id} not found`);
    }

    const updatedVector = update.vector ?? existing.vector;

    const updatedPoint = Point.create({
      id: existing.id.value,
      vector: updatedVector,
    });

    await this.save(updatedPoint, collection);
    return updatedPoint;
  }

  private async ensureCollection(dim: number, name?: string) {
    try {
      await this.client.getCollection(name ?? QDRANT_COLLECTION);
    } catch {
      await this.client.createCollection(name ?? QDRANT_COLLECTION, {
        vectors: {
          size: dim,
          distance: 'Cosine',
        },
      });
    }
  }
}
