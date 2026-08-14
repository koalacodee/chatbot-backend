import { Injectable, NotFoundException } from '@nestjs/common';
import { count, eq, inArray, sql } from 'drizzle-orm';
import {
  buildConflictUpdateColumns,
  DrizzleService,
} from 'src/common/drizzle/drizzle.service';
import { admins } from 'src/common/drizzle/schema';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminRepository } from '../../domain/repositories/admin.repository';

type DrizzleAdmin = typeof admins.$inferSelect;

@Injectable()
export class DrizzleAdminRepository extends AdminRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /**
   * The admins table is just (id, user_id) — no timestamps, no relation columns. The
   * Prisma version listed `user`, `promotions`, `approvedTasks` and friends here, but
   * it never passed an `include`, so those were always undefined and the entity fell
   * back to its own defaults. Same result, without pretending to read columns that are
   * not in the row.
   */
  private toDomain(row: DrizzleAdmin): Admin {
    return Admin.create({
      id: row.id,
      userId: row.userId,
    });
  }

  async save(admin: Admin): Promise<Admin> {
    const [saved] = await this.db
      .insert(admins)
      .values({ id: admin.id.value, userId: admin.userId.value })
      .onConflictDoUpdate({
        target: admins.id,
        set: buildConflictUpdateColumns(admins, ['userId']),
      })
      .returning();

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Admin | null> {
    const rows = await this.db
      .select()
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAll(): Promise<Admin[]> {
    const rows = await this.db.select().from(admins);

    return rows.map((row) => this.toDomain(row));
  }

  async removeById(id: string): Promise<Admin | null> {
    const deleted = await this.db
      .delete(admins)
      .where(eq(admins.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Admin[]> {
    if (ids.length === 0) return [];

    const rows = await this.db
      .select()
      .from(admins)
      .where(inArray(admins.id, ids));

    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, update: Partial<Admin>): Promise<Admin> {
    // userId is a UUID value object on the entity, but callers have been known to hand
    // over a plain string, so accept either — same duck-typing the Prisma version did.
    const incoming = (update)?.userId;
    const userId = incoming?.value ?? incoming?.toString?.() ?? incoming;

    // Drizzle refuses an empty `set`, and Prisma treated an empty data object as a
    // no-op that still returned the row, so mirror that with a plain read.
    if (!userId) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundException('Admin not found');
      return existing;
    }

    const [updated] = await this.db
      .update(admins)
      .set({ userId: userId.toString() })
      .where(eq(admins.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Admin not found');

    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(admins)
      .where(eq(admins.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(admins);

    return Number(rows[0].value);
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    const rows = await this.db
      .select()
      .from(admins)
      .where(eq(admins.userId, userId))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }
}
