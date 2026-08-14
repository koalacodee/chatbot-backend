import { Injectable } from '@nestjs/common';
import { count, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { guests } from 'src/common/drizzle/schema';
import { Guest } from '../../domain/entities/guest.entity';
import { GuestRepository } from '../../domain/repositories/guest.repository';

type GuestRow = typeof guests.$inferSelect;

@Injectable()
export class DrizzleGuestRepository extends GuestRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /**
   * `Guest.fromJSON` takes createdAt/updatedAt as ISO strings and does the `new Date()`
   * itself, which is exactly what the `mode: 'string'` timestamp columns hand back — so
   * a Drizzle row drops straight in.
   */
  private toDomain(row: GuestRow): Guest {
    return Guest.fromJSON(row);
  }

  async save(guest: Guest): Promise<Guest> {
    const values = {
      id: guest.id.toString(),
      name: guest.name,
      email: guest.email.getValue(),
      phone: guest.phone,
      createdAt: guest.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    const [saved] = await this.db
      .insert(guests)
      .values(values)
      .onConflictDoUpdate({
        target: guests.id,
        // Mirrors Prisma's update block, which left createdAt alone.
        set: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Guest | null> {
    const rows = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Guest | null> {
    const rows = await this.db
      .select()
      .from(guests)
      .where(eq(guests.email, email))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByPhone(phone: string): Promise<Guest | null> {
    const rows = await this.db
      .select()
      .from(guests)
      .where(eq(guests.phone, phone))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Guest[]> {
    let query = this.db
      .select()
      .from(guests)
      .orderBy(desc(guests.createdAt))
      .$dynamic();

    if (limit !== undefined) query = query.limit(limit);
    if (offset !== undefined) query = query.offset(offset);

    const rows = await query;

    return rows.map((row) => this.toDomain(row));
  }

  async removeById(id: string): Promise<Guest | null> {
    const deleted = await this.db
      .delete(guests)
      .where(eq(guests.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async exists(id: string): Promise<boolean> {
    return this.existsWhere(eq(guests.id, id));
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.existsWhere(eq(guests.email, email));
  }

  async existsByPhone(phone: string): Promise<boolean> {
    return this.existsWhere(eq(guests.phone, phone));
  }

  private async existsWhere(where: ReturnType<typeof eq>): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(guests)
      .where(where)
      .limit(1);

    return rows.length > 0;
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ value: count() }).from(guests);

    return Number(rows[0].value);
  }
}
