import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { Attachment } from '../../domain/entities/attachment.entity';

@Injectable()
export class PrismaAttachmentRepository extends AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(rec: any): Attachment {
    return Attachment.create({
      id: rec.id,
      type: rec.type,
      filename: rec.filename,
      originalName: rec.originalName,
      expirationDate: rec.expirationDate ?? undefined,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      targetId: rec.targetId,
    });
  }

  async save(attachment: Attachment): Promise<Attachment> {
    const data = {
      id: attachment.id,
      type: attachment.type,
      filename: attachment.filename,
      originalName: attachment.originalName,
      expirationDate: attachment.expirationDate ?? null,
      targetId: attachment.targetId,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    } as const;

    const upsert = await this.prisma.attachment.upsert({
      where: { id: data.id },
      update: {
        type: data.type,
        filename: data.filename,
        originalName: data.originalName,
        expirationDate: data.expirationDate,
        targetId: data.targetId,
        updatedAt: new Date(),
      },
      create: data,
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Attachment | null> {
    const rec = await this.prisma.attachment.findUnique({ where: { id } });
    return rec ? this.toDomain(rec) : null;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.attachment.count({ where: { id } });
    return count > 0;
  }

  async findByTargetId(targetId: string): Promise<Attachment[]> {
    const items = await this.prisma.attachment.findMany({
      where: { targetId },
    });
    return items.map((r) => this.toDomain(r));
  }

  async countByTargetId(targetId: string): Promise<number> {
    return this.prisma.attachment.count({ where: { targetId } });
  }

  async removeByTargetId(targetId: string): Promise<Attachment[]> {
    const existing = await this.prisma.attachment.findMany({
      where: { targetId },
    });
    if (existing.length === 0) return [];
    await this.prisma.attachment.deleteMany({ where: { targetId } });
    return existing.map((r) => this.toDomain(r));
  }

  async removeById(id: string): Promise<Attachment | null> {
    const rec = await this.findById(id);
    if (!rec) return null;
    await this.prisma.attachment.delete({ where: { id } });
    return rec;
  }

  async update(
    id: string,
    update: Partial<
      Pick<
        Attachment,
        'type' | 'filename' | 'originalName' | 'expirationDate' | 'targetId'
      >
    >,
  ): Promise<Attachment> {
    const data: Record<string, any> = {};
    if (typeof update.type !== 'undefined') data.type = update.type;
    if (typeof update.filename !== 'undefined') data.filename = update.filename;
    if (typeof update.originalName !== 'undefined')
      data.originalName = update.originalName;
    if (typeof update.expirationDate !== 'undefined')
      data.expirationDate = update.expirationDate ?? null;
    if (typeof update.targetId !== 'undefined') data.targetId = update.targetId;
    data.updatedAt = new Date();

    const rec = await this.prisma.attachment.update({ where: { id }, data });
    return this.toDomain(rec);
  }
}
