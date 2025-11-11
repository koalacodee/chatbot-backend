import { Export } from '../entities/export.entity';

export abstract class ExportRepository {
  abstract save(exportEntity: Export): Promise<Export>;
  abstract saveMany(exports: Export[]): Promise<Export[]>;
  abstract findById(id: string): Promise<Export | null>;
  abstract findByIds(ids: string[]): Promise<Export[]>;
  abstract removeById(id: string): Promise<Export | null>;
  abstract removeByIds(ids: string[]): Promise<Export[]>;
  abstract count(): Promise<number>;
  abstract exists(id: string): Promise<boolean>;
  abstract findAll(offset?: number, limit?: number): Promise<Export[]>;
}

