import { Export } from '../domain/entities/export.entity';
import { ExportRepository } from '../domain/repositories/export.repository';

export class FakeExportRepository extends ExportRepository {
  readonly exports = new Map<string, Export>();

  /** Entities handed to `save`, in call order. */
  readonly saved: Export[] = [];

  seed(...entities: Export[]): this {
    for (const entity of entities) this.exports.set(entity.id, entity);
    return this;
  }

  async save(entity: Export): Promise<Export> {
    this.saved.push(entity);
    this.exports.set(entity.id, entity);
    return entity;
  }

  async saveMany(entities: Export[]): Promise<Export[]> {
    for (const entity of entities) await this.save(entity);
    return entities;
  }

  async findById(id: string): Promise<Export | null> {
    return this.exports.get(id) ?? null;
  }

  /** Set semantics, matching `WHERE id IN (...)`. */
  async findByIds(ids: string[]): Promise<Export[]> {
    return [...new Set(ids)]
      .map((id) => this.exports.get(id))
      .filter((entity): entity is Export => entity !== undefined);
  }

  async removeById(id: string): Promise<Export | null> {
    const existing = this.exports.get(id) ?? null;
    this.exports.delete(id);
    return existing;
  }

  async removeByIds(ids: string[]): Promise<Export[]> {
    const removed = await this.findByIds(ids);
    for (const entity of removed) this.exports.delete(entity.id);
    return removed;
  }

  async count(): Promise<number> {
    return this.exports.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.exports.has(id);
  }

  async findAll(offset = 0, limit?: number): Promise<Export[]> {
    const all = [...this.exports.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return limit === undefined
      ? all.slice(offset)
      : all.slice(offset, offset + limit);
  }
}
