import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { RetrievedChunk } from 'src/chat/domain/entities/retrieved-chunk.entity';
import { RetrievedChunkRepository } from 'src/chat/domain/repositories/retrieved-chunk.repository';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { knowledgeChunks, retrievedChunks } from 'src/common/drizzle/schema';
import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';

type RetrievedChunkRow = typeof retrievedChunks.$inferSelect;
type KnowledgeChunkRow = typeof knowledgeChunks.$inferSelect;

@Injectable()
export class DrizzleRetrievedChunkRepository extends RetrievedChunkRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(
    row: RetrievedChunkRow,
    knowledgeChunk: KnowledgeChunk,
  ): RetrievedChunk {
    return RetrievedChunk.create({
      id: row.id,
      messageId: row.messageId,
      knowledgeChunk,
      score: row.score,
      retrievedAt: new Date(row.retrievedAt),
    });
  }

  private toKnowledgeChunk(row: KnowledgeChunkRow): KnowledgeChunk {
    return KnowledgeChunk.create({
      id: row.id,
      content: row.content,
      departmentId: row.departmentId,
      pointId: row.pointId ?? undefined,
    });
  }

  async save(chunk: RetrievedChunk): Promise<RetrievedChunk> {
    // updated_at is `@updatedAt` in Prisma and NOT NULL without a Postgres default.
    const updatedAt = new Date().toISOString();

    const values = {
      id: chunk.id,
      messageId: chunk.messageId,
      knowledgeChunkId: chunk.knowledgeChunk.id.value,
      score: chunk.score,
      retrievedAt: chunk.retrievedAt.toISOString(),
      updatedAt,
    };

    const [saved] = await this.db
      .insert(retrievedChunks)
      .values(values)
      .onConflictDoUpdate({
        target: retrievedChunks.id,
        set: {
          messageId: values.messageId,
          knowledgeChunkId: values.knowledgeChunkId,
          score: values.score,
          retrievedAt: values.retrievedAt,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    // The Prisma version read back a row with no `knowledgeChunk` include, so the entity
    // it returned carried `undefined` there and blew up on `toJSON()`. The caller already
    // holds the chunk, so hand it back rather than re-reading or dropping it.
    return this.toDomain(saved, chunk.knowledgeChunk);
  }

  async findById(id: string): Promise<RetrievedChunk | null> {
    const rows = await this.db
      .select({ retrieved: retrievedChunks, knowledge: knowledgeChunks })
      .from(retrievedChunks)
      .innerJoin(
        knowledgeChunks,
        eq(knowledgeChunks.id, retrievedChunks.knowledgeChunkId),
      )
      .where(eq(retrievedChunks.id, id))
      .limit(1);

    if (!rows[0]) return null;

    return this.toDomain(
      rows[0].retrieved,
      this.toKnowledgeChunk(rows[0].knowledge),
    );
  }

  async findAll(): Promise<RetrievedChunk[]> {
    const rows = await this.db
      .select({ retrieved: retrievedChunks, knowledge: knowledgeChunks })
      .from(retrievedChunks)
      .innerJoin(
        knowledgeChunks,
        eq(knowledgeChunks.id, retrievedChunks.knowledgeChunkId),
      );

    return rows.map((row) =>
      this.toDomain(row.retrieved, this.toKnowledgeChunk(row.knowledge)),
    );
  }

  async removeById(id: string): Promise<RetrievedChunk | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.delete(retrievedChunks).where(eq(retrievedChunks.id, id));

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(retrievedChunks)
      .where(eq(retrievedChunks.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db
      .select({ value: count() })
      .from(retrievedChunks);

    return Number(rows[0].value);
  }
}
