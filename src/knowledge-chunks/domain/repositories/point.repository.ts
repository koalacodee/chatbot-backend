import { Point } from '../entities/point.entity';

export abstract class PointRepository {
  abstract save(point: Point): Promise<Point>;
  abstract saveMany(points: Point[]): Promise<Point[]>;
  abstract findById(id: string): Promise<Point | null>;
  abstract findByIds(ids: string[]): Promise<Point[]>;
  abstract findByKnowledgeChunkId(knowledgeChunkId: string): Promise<Point[]>;
  abstract removeById(id: string): Promise<Point | null>;
  abstract removeByIds(ids: string[]): Promise<Point[]>;
  abstract search(
    vector: Point['vector'],
    limit: number,
    minScore?: number,
  ): Promise<Point[]>;
  abstract count(): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
  abstract update(id: string, update: Partial<Point>): Promise<Point>;
  abstract findAll(offset?: number, limit?: number): Promise<Point[]>;
}