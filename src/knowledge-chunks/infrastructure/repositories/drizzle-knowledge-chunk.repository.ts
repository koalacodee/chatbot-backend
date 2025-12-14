import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { knowledgeChunks } from 'src/common/drizzle/schema';
import { eq, inArray, count, sql } from 'drizzle-orm';

export type DrizzleKnowledgeChunk = typeof knowledgeChunks.$inferSelect;

type DeptChunks = {
  departmentId: string;
  chunks: DrizzleKnowledgeChunk[];
};
@Injectable()
export class DrizzleKnowledgeChunkRepository extends KnowledgeChunkRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(rec: DrizzleKnowledgeChunk): KnowledgeChunk {
    return KnowledgeChunk.create({
      id: rec.id,
      content: rec.content,
      pointId: rec.pointId,
    });
  }

  async save(chunk: KnowledgeChunk): Promise<KnowledgeChunk> {
    const data = {
      id: chunk.id.value,
      content: chunk.content,
      departmentId: chunk.department.id.toString(),
      pointId: chunk.pointId,
      updatedAt: new Date().toISOString(),
    };

    const [existing] = await this.db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.id, data.id))
      .limit(1);

    if (existing) {
      await this.db
        .update(knowledgeChunks)
        .set(data)
        .where(eq(knowledgeChunks.id, data.id));
    } else {
      await this.db.insert(knowledgeChunks).values({
        ...data,
        createdAt: new Date().toISOString(),
      });
    }

    return this.findById(data.id) as Promise<KnowledgeChunk>;
  }

  async findById(id: string): Promise<KnowledgeChunk | null> {
    const [result] = await this.db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.id, id))
      .limit(1);

    return result ? this.toDomain(result) : null;
  }

  async findAll(): Promise<KnowledgeChunk[]> {
    const results = await this.db.select().from(knowledgeChunks);

    return results.map((r) => this.toDomain(r));
  }

  async removeById(id: string): Promise<KnowledgeChunk | null> {
    const chunk = await this.findById(id);
    if (!chunk) return null;
    await this.db.delete(knowledgeChunks).where(eq(knowledgeChunks.id, id));
    return chunk;
  }

  async findByIds(ids: string[]): Promise<KnowledgeChunk[]> {
    if (ids.length === 0) return [];

    const results = await this.db
      .select()
      .from(knowledgeChunks)
      .where(inArray(knowledgeChunks.id, ids));

    return results.map((r) => this.toDomain(r));
  }

  async update(
    id: string,
    update: Partial<KnowledgeChunk>,
  ): Promise<KnowledgeChunk> {
    const data: any = {};
    if (update.content) data.content = update.content;
    if (update.pointId) data.pointId = update.pointId;
    // Note: department update might need special handling if we are just passing the ID,
    // but the interface says Partial<KnowledgeChunk> which has a Department entity.
    // Usually updates come as DTOs but here it's domain entity partial.
    // Assuming we might extract department ID if available, but typically updates are shallow on the entity properties.
    // Let's check if department is present and has an ID.
    if (update.department?.id) {
      data.departmentId = update.department.id.toString();
    }

    if (Object.keys(data).length > 0) {
      data.updatedAt = new Date().toISOString();
      await this.db
        .update(knowledgeChunks)
        .set(data)
        .where(eq(knowledgeChunks.id, id));
    }

    return this.findById(id) as Promise<KnowledgeChunk>;
  }

  async exists(id: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.id, id))
      .limit(1);
    return !!result;
  }

  async count(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(knowledgeChunks);
    return result ? Number(result.count) : 0;
  }

  async findByDepartmentId(departmentId: string): Promise<KnowledgeChunk[]> {
    const results = await this.db
      .select()
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.departmentId, departmentId));

    return results.map((r) => this.toDomain(r));
  }

  async findByPointIds(pointIds: string[]): Promise<KnowledgeChunk[]> {
    if (pointIds.length === 0) return [];

    const results = await this.db
      .select()
      .from(knowledgeChunks)
      .where(inArray(knowledgeChunks.pointId, pointIds));

    return results.map((r) => this.toDomain(r));
  }

  async findAllGroupedByDepartment(): Promise<
    { departmentId: string; knowledgeChunks: KnowledgeChunk[] }[]
  > {
    const rows: DeptChunks[] = await this.db
      .execute<DeptChunks>(
        sql<DeptChunks>`
    SELECT department_id                     AS "departmentId",
           json_agg(knowledge_chunks.* ORDER BY created_at) AS chunks
    FROM knowledge_chunks
    GROUP BY department_id
    ORDER BY department_id;
  `,
      )
      .then((result) => result.rows);

    return rows.map((row) => ({
      departmentId: row.departmentId,
      knowledgeChunks: row.chunks.map((chunkData: any) =>
        this.toDomain(chunkData),
      ),
    }));
  }
}
