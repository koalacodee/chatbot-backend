import { Injectable } from '@nestjs/common';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { exportsTable } from 'src/common/drizzle/schema';
import { Export, ExportType } from '../../domain/entities/export.entity';
import { ExportRepository } from '../../domain/repositories/export.repository';

type ExportRow = typeof exportsTable.$inferSelect;
type ExportTypeDb = ExportRow['type'];

/**
 * Prisma declared `enum ExportType { CSV @map("csv") JSON @map("json") }`, so the domain
 * saw SCREAMING_CASE while Postgres stores lowercase. Drizzle passes the label through
 * untouched, so both directions have to be mapped or writes fail the enum check and
 * reads come back with a type the domain enum does not contain.
 */
const TYPE_TO_DB: Record<ExportType, ExportTypeDb> = {
  [ExportType.CSV]: 'csv',
  [ExportType.JSON]: 'json',
};

const TYPE_TO_DOMAIN: Record<ExportTypeDb, ExportType> = {
  csv: ExportType.CSV,
  json: ExportType.JSON,
};

@Injectable()
export class DrizzleExportRepository extends ExportRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: ExportRow): Export {
    return Export.create({
      id: row.id,
      type: TYPE_TO_DOMAIN[row.type],
      objectPath: row.objectPath,
      size: row.size,
      rows: row.rows,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  // updated_at is `@updatedAt` in Prisma and NOT NULL without a Postgres default, so it
  // is stamped on every write.
  private toRow(entity: Export): typeof exportsTable.$inferInsert {
    return {
      id: entity.id,
      type: TYPE_TO_DB[entity.type],
      objectPath: entity.objectPath,
      size: entity.size,
      rows: entity.rows,
      updatedAt: new Date().toISOString(),
    };
  }

  async save(exportEntity: Export): Promise<Export> {
    const row = this.toRow(exportEntity);
    const { id: _id, ...updatable } = row;

    const [saved] = await this.db
      .insert(exportsTable)
      .values(row)
      .onConflictDoUpdate({ target: exportsTable.id, set: updatable })
      .returning();

    return this.toDomain(saved);
  }

  async saveMany(exports: Export[]): Promise<Export[]> {
    if (exports.length === 0) return [];

    // Looped inside one transaction rather than a single multi-row upsert: Postgres
    // rejects `ON CONFLICT DO UPDATE` when one statement touches the same id twice, and
    // the caller does not promise unique ids.
    return this.db.transaction(async (tx) => {
      const saved: Export[] = [];

      for (const exportEntity of exports) {
        const row = this.toRow(exportEntity);
        const { id: _id, ...updatable } = row;

        const [upserted] = await tx
          .insert(exportsTable)
          .values(row)
          .onConflictDoUpdate({ target: exportsTable.id, set: updatable })
          .returning();

        saved.push(this.toDomain(upserted));
      }

      return saved;
    });
  }

  async findById(id: string): Promise<Export | null> {
    const rows = await this.db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Export[]> {
    if (ids.length === 0) return [];

    const rows = await this.db
      .select()
      .from(exportsTable)
      .where(inArray(exportsTable.id, ids));

    return rows.map((row) => this.toDomain(row));
  }

  async removeById(id: string): Promise<Export | null> {
    const deleted = await this.db
      .delete(exportsTable)
      .where(eq(exportsTable.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async removeByIds(ids: string[]): Promise<Export[]> {
    if (ids.length === 0) return [];

    // One statement instead of the old read-then-delete pair; RETURNING gives back
    // exactly the rows that were removed.
    const deleted = await this.db
      .delete(exportsTable)
      .where(inArray(exportsTable.id, ids))
      .returning();

    return deleted.map((row) => this.toDomain(row));
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(exportsTable);

    return Number(rows[0].value);
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(exportsTable)
      .where(eq(exportsTable.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async findAll(offset?: number, limit?: number): Promise<Export[]> {
    let query = this.db
      .select()
      .from(exportsTable)
      .orderBy(desc(exportsTable.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map((row) => this.toDomain(row));
  }
}
