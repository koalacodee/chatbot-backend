import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { refreshTokens } from 'src/common/drizzle/schema';

type DrizzleRefreshToken = typeof refreshTokens.$inferSelect;

@Injectable()
export class DrizzleRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  /**
   * Every timestamp on refresh_tokens is declared `mode: 'string'`, so Drizzle hands
   * back ISO strings where Prisma handed back Dates. The entity types them as Date and
   * calls `.getTime()` on expiresAt, so they have to be rehydrated here.
   */
  private toDomain(row: DrizzleRefreshToken): RefreshToken {
    return new RefreshToken({
      id: row.id,
      token: row.token,
      targetId: row.targetId,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      revokedAt: row.revokedAt ? new Date(row.revokedAt) : undefined,
    });
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    await this.db.insert(refreshTokens).values({
      id: refreshToken.id,
      token: refreshToken.token,
      targetId: refreshToken.targetId.value,
      expiresAt: refreshToken.expiresAt.toISOString(),
      createdAt: refreshToken.createdAt.toISOString(),
      updatedAt: refreshToken.updatedAt.toISOString(),
      revokedAt: refreshToken.revokedAt?.toISOString() ?? null,
    });
  }

  async findByToken(token: string): Promise<RefreshToken> {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteAllForTarget(targetId: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.targetId, targetId));
  }

  async revokeToken(token: string): Promise<void> {
    // `updatedAt` is `@updatedAt` in the Prisma schema, so Prisma bumped it on every
    // write. Drizzle has no such hook, so it is set explicitly to keep the column
    // meaningful.
    const now = new Date().toISOString();

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(refreshTokens.token, token));
  }
}
