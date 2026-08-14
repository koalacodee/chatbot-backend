import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from 'src/common/drizzle/drizzle.service';
import { translations } from 'src/common/drizzle/schema';
import { SupportedLanguage } from 'src/translation/domain/services/translation.service';
import { Translation } from '../../domain/entities/translation.entity';
import { TranslationRepository } from '../../domain/repositories/translation.repository';

type TranslationRow = typeof translations.$inferSelect;

/**
 * Prisma declared `enum TranslationLanguage { EN @map("en") ... }`, so its client dealt
 * in 'EN' while Postgres stores 'en'. That is why the old repository lowercased on every
 * read and uppercased on every write.
 *
 * Drizzle uses the Postgres labels directly, and those are already exactly the
 * `SupportedLanguage` union — so the conversions are not just unnecessary here, an
 * `toUpperCase()` would produce a label the enum does not accept and fail every write.
 * `row.lang` is typed as the union with no cast.
 */
@Injectable()
export class DrizzleTranslationRepository extends TranslationRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  private get db() {
    return this.drizzle.client;
  }

  private toDomain(row: TranslationRow): Translation {
    return Translation.create({
      id: row.id,
      lang: row.lang,
      content: row.content,
      targetId: row.targetId,
      subTarget: row.subTarget ?? undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  // updated_at is `@updatedAt` in Prisma and NOT NULL without a Postgres default.
  private toRow(translation: Translation): typeof translations.$inferInsert {
    return {
      id: translation.id.toString(),
      lang: translation.lang,
      content: translation.content,
      targetId: translation.targetId.toString(),
      subTarget: translation.subTarget ?? null,
      createdAt: translation.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async save(translation: Translation): Promise<Translation> {
    const row = this.toRow(translation);
    const { id: _id, createdAt: _createdAt, ...updatable } = row;

    const [saved] = await this.db
      .insert(translations)
      .values(row)
      .onConflictDoUpdate({ target: translations.id, set: updatable })
      .returning();

    return this.toDomain(saved);
  }

  async createMany(newTranslations: Translation[]): Promise<Translation[]> {
    if (newTranslations.length === 0) return [];

    // Prisma's `createMany` here had no `skipDuplicates`, so a clashing id was an error.
    // Left that way rather than quietly swallowing it.
    await this.db
      .insert(translations)
      .values(newTranslations.map((translation) => this.toRow(translation)));

    return newTranslations;
  }

  async findByTargetId(targetId: string): Promise<Translation[]> {
    const rows = await this.db
      .select()
      .from(translations)
      .where(eq(translations.targetId, targetId))
      .orderBy(asc(translations.createdAt));

    return rows.map((row) => this.toDomain(row));
  }

  async findByTargetIds(targetIds: string[]): Promise<Translation[]> {
    if (targetIds.length === 0) return [];

    const rows = await this.db
      .select()
      .from(translations)
      .where(inArray(translations.targetId, targetIds))
      .orderBy(asc(translations.createdAt));

    return rows.map((row) => this.toDomain(row));
  }

  async findByTargetIdAndLang(
    targetId: string,
    lang: SupportedLanguage,
  ): Promise<Translation | null> {
    const rows = await this.db
      .select()
      .from(translations)
      .where(
        and(eq(translations.targetId, targetId), eq(translations.lang, lang)),
      )
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async update(
    id: string,
    translation: Partial<Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Translation> {
    const set: Partial<typeof translations.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (translation.lang) set.lang = translation.lang;
    if (translation.content) set.content = translation.content;
    if (translation.targetId) set.targetId = translation.targetId.toString();

    const [updated] = await this.db
      .update(translations)
      .set(set)
      .where(eq(translations.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Translation not found');

    return this.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(translations).where(eq(translations.id, id));
  }

  async removeByTargetId(targetId: string): Promise<void> {
    await this.db
      .delete(translations)
      .where(eq(translations.targetId, targetId));
  }
}
