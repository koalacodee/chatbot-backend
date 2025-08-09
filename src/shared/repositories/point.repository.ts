import { Point } from 'src/shared/entities/point.entity';

export abstract class PointRepository {
  abstract save(point: Point, collection?: string): Promise<Point>;
  abstract saveMany(points: Point[], collection?: string): Promise<Point[]>;
  abstract findById(id: string, collection?: string): Promise<Point | null>;
  abstract findByIds(ids: string[], collection?: string): Promise<Point[]>;
  abstract removeById(id: string, collection?: string): Promise<Point | null>;
  abstract removeByIds(ids: string[], collection?: string): Promise<Point[]>;
  abstract search(
    vector: Point['vector'],
    limit: number,
    minScore?: number,
    collection?: string,
    ids?: string[],
  ): Promise<Point[]>;
  abstract count(collection?: string): Promise<number>;
  abstract exists(id: string, collection?: string): Promise<boolean>;
  abstract update(
    id: string,
    update: Partial<Point>,
    collection?: string,
  ): Promise<Point>;
  abstract findAll(
    offset?: number,
    limit?: number,
    collection?: string,
  ): Promise<Point[]>;
}
