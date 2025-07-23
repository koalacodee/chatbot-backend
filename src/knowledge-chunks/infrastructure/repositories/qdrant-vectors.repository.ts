import { Injectable } from '@nestjs/common';
import { VectorsRepository } from '../../domain/repositories/vectors.repository';
import { Vector } from '../../domain/value-objects/vector.vo';
import { QdrantService } from '../../../common/qdrant/qdrant.service';

const QDRANT_COLLECTION = 'vectors';

@Injectable()
export class QdrantVectorsRepository extends VectorsRepository {
  constructor(private readonly qdrantService: QdrantService) {
    super();
  }

  private get client() {
    return this.qdrantService.getClient();
  }

  async save(vector: Vector): Promise<Vector> {
    await this.ensureCollection(vector.dim);
    await this.client.upsert(QDRANT_COLLECTION, {
      points: [
        {
          id: vector.id.value,
          vector: vector.value,
          payload: { dim: vector.dim },
        },
      ],
    });
    return vector;
  }

  async saveMany(vectors: Vector[]): Promise<Vector[]> {
    if (vectors.length === 0) return [];
    await this.ensureCollection(vectors[0].dim);
    await this.client.upsert(QDRANT_COLLECTION, {
      points: vectors.map((vector) => ({
        id: vector.id.value,
        vector: vector.value,
        payload: { dim: vector.dim },
      })),
    });
    return vectors;
  }

  async findById(id: string): Promise<Vector | null> {
    const result = await this.client.retrieve(QDRANT_COLLECTION, {
      ids: [id],
      with_payload: true,
    });
    const point = result?.[0];
    if (!point) return null;
    return Vector.create({
      id: point.id as string,
      vector: point.vector as number[],
      dim: point.payload.dim as any,
    });
  }

  async findByIds(ids: string[]): Promise<Vector[]> {
    if (ids.length === 0) return [];
    const result = await this.client.retrieve(QDRANT_COLLECTION, {
      ids,
      with_payload: true,
    });
    return (result || []).map((point) =>
      Vector.create({
        id: point.id as string,
        vector: point.vector as number[],
        dim: point.payload.dim as any,
      }),
    );
  }

  async findAll(): Promise<Vector[]> {
    // Qdrant's scroll API is used to fetch all points in the collection.
    let allPoints: any[] = [];
    let offset: string | number | Record<string, unknown> = undefined;
    const limit = 1000; // reasonable batch size

    while (true) {
      const result = await this.client.scroll(QDRANT_COLLECTION, {
        with_payload: true,
        with_vector: true,
        limit,
        offset,
      });
      if (result?.points?.length) {
        allPoints = allPoints.concat(result.points);
        if (result.next_page_offset) {
          offset = result.next_page_offset;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return allPoints.map((point) =>
      Vector.create({
        id: point.id as string,
        vector: point.vector as number[],
        dim: point.payload.dim as any,
      }),
    );
  }

  async removeById(id: string): Promise<Vector | null> {
    const found = await this.findById(id);
    if (found) {
      await this.client.delete(QDRANT_COLLECTION, { points: [id] });
    }
    return found;
  }

  async removeByIds(ids: string[]): Promise<Vector[]> {
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
  ): Promise<Vector[]> {
    const result = await this.client.search(QDRANT_COLLECTION, {
      vector: vector.value,
      limit,
      with_payload: true,
      score_threshold: minScore,
    });
    return result.map((point) =>
      Vector.create({
        id: point.id as string,
        vector: point.vector as number[],
        dim: point.payload.dim as any,
      }),
    );
  }

  async count(): Promise<number> {
    const collection = await this.client.getCollection(QDRANT_COLLECTION);
    return collection?.points_count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const vector = await this.findById(id);
    return !!vector;
  }

  async update(id: string, update: Partial<Vector>): Promise<Vector> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Vector with id ${id} not found`);
    }
    const updated = Vector.create({
      id: existing.id.toString(),
      vector: update.value ?? existing.value,
      dim: update.dim ?? existing.dim,
    });
    await this.save(updated);
    return updated;
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
