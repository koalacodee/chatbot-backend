import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Translation } from '../../domain/entities/translation.entity';
import { TranslationRepository } from '../../domain/repositories/translation.repository';
import PrismaClient from '@prisma/client';
import { SupportedLanguage } from 'src/translation/domain/services/translation.service';

@Injectable()
export class PrismaTranslationRepository extends TranslationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(translation: PrismaClient.Translation): Translation {
    return Translation.create({
      ...translation,
      lang: translation.lang.toLowerCase() as SupportedLanguage,
    });
  }

  private fromDomain(translation: Translation): PrismaClient.Translation {
    return {
      ...translation.toJSON(),
      lang: translation.lang.toUpperCase() as PrismaClient.TranslationLanguage,
    };
  }

  async save(translation: Translation): Promise<Translation> {
    const data = this.fromDomain(translation);
    const upsert = await this.prisma.translation.upsert({
      where: { id: translation.id.toString() },
      update: data,
      create: data,
    });
    return this.toDomain(upsert);
  }

  async createMany(translations: Translation[]): Promise<Translation[]> {
    const data = translations.map((t) => this.fromDomain(t));
    await this.prisma.translation.createMany({
      data,
    });
    return translations;
  }

  async findByTargetId(targetId: string): Promise<Translation[]> {
    const translations = await this.prisma.translation.findMany({
      where: { targetId },
      orderBy: { createdAt: 'asc' },
    });

    return translations.map((t) => this.toDomain(t));
  }

  async findByTargetIds(targetIds: string[]): Promise<Translation[]> {
    const translations = await this.prisma.translation.findMany({
      where: { targetId: { in: targetIds } },
      orderBy: { createdAt: 'asc' },
    });
    return translations.map((t) => this.toDomain(t));
  }

  async findByTargetIdAndLang(
    targetId: string,
    lang: SupportedLanguage,
  ): Promise<Translation | null> {
    const translation = await this.prisma.translation.findFirst({
      where: {
        targetId,
        lang: lang.toUpperCase() as PrismaClient.TranslationLanguage,
      },
    });

    if (!translation) {
      return null;
    }

    return this.toDomain(translation);
  }

  async update(
    id: string,
    translation: Partial<Omit<Translation, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Translation> {
    const updated = await this.prisma.translation.update({
      where: { id: id.toString() },
      data: {
        ...(translation.lang && {
          lang: translation.lang.toUpperCase() as PrismaClient.TranslationLanguage,
        }),
        ...(translation.content && { content: translation.content }),
        ...(translation.targetId && {
          targetId: translation.targetId.toString(),
        }),
      },
    });

    return this.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.translation.delete({
      where: { id },
    });
  }

  async removeByTargetId(targetId: string): Promise<void> {
    await this.prisma.translation.deleteMany({
      where: { targetId },
    });
  }
}
