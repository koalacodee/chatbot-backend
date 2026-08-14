import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { profilePictures } from 'src/common/drizzle/schema';
import { ProfilePicture } from '../../domain/entities/profile-picture.entity';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';

type ProfilePictureRow = typeof profilePictures.$inferSelect;

@Injectable()
export class DrizzleProfilePictureRepository extends ProfilePictureRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /**
   * `profile_pictures` only stores (id, user_id, filename, created_at, updated_at).
   * `originalName`, `mimeType` and `size` are declared on the entity and accepted by
   * `update()`, but there are no columns behind them — the Prisma mapper read them off
   * the row as well and always got undefined.
   */
  private toDomain(row: ProfilePictureRow): ProfilePicture {
    return ProfilePicture.create({
      id: row.id,
      userId: row.userId,
      filename: row.filename,
      originalName: undefined,
      mimeType: undefined,
      size: undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  async save(profilePicture: ProfilePicture): Promise<ProfilePicture> {
    const values = {
      id: profilePicture.id,
      userId: profilePicture.userId,
      filename: profilePicture.filename,
      createdAt: profilePicture.createdAt.toISOString(),
      // `@updatedAt` in Prisma, NOT NULL without a Postgres default.
      updatedAt: new Date().toISOString(),
    };

    const [saved] = await this.db
      .insert(profilePictures)
      .values(values)
      .onConflictDoUpdate({
        target: profilePictures.id,
        // Mirrors Prisma's update block: filename only, createdAt left alone.
        set: { filename: values.filename, updatedAt: values.updatedAt },
      })
      .returning();

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<ProfilePicture | null> {
    const rows = await this.db
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.id, id))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<ProfilePicture | null> {
    const rows = await this.db
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.userId, userId))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findByUserIds(userIds: string[]): Promise<ProfilePicture[]> {
    if (userIds.length === 0) return [];

    const rows = await this.db
      .select()
      .from(profilePictures)
      .where(inArray(profilePictures.userId, userIds));

    return rows.map((row) => this.toDomain(row));
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ exists: sql`1` })
      .from(profilePictures)
      .where(eq(profilePictures.id, id))
      .limit(1);

    return rows.length > 0;
  }

  async removeById(id: string): Promise<ProfilePicture | null> {
    // One statement instead of the old read-then-delete pair.
    const deleted = await this.db
      .delete(profilePictures)
      .where(eq(profilePictures.id, id))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async removeByUserId(userId: string): Promise<ProfilePicture | null> {
    const deleted = await this.db
      .delete(profilePictures)
      .where(eq(profilePictures.userId, userId))
      .returning();

    return deleted[0] ? this.toDomain(deleted[0]) : null;
  }

  async update(
    id: string,
    update: Partial<
      Pick<ProfilePicture, 'filename' | 'originalName' | 'mimeType' | 'size'>
    >,
  ): Promise<ProfilePicture> {
    // Only `filename` has a column, so the other three are accepted and discarded —
    // exactly what the Prisma version did.
    const set: Partial<typeof profilePictures.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.filename !== undefined) set.filename = update.filename;

    const [updated] = await this.db
      .update(profilePictures)
      .set(set)
      .where(eq(profilePictures.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Profile picture not found');

    return this.toDomain(updated);
  }
}
