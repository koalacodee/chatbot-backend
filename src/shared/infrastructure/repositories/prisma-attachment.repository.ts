import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AttachmentRepository } from 'src/shared/repositories/attachment.repository';
import { Attachment } from 'src/shared/entities/attachment.entity';

@Injectable()
export class PrismaAttachmentRepository extends AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(rec: any): Attachment {
    return Attachment.create({
      id: rec.id,
      name: rec.name,
      type: rec.type,
      dataUrl: rec.dataUrl ?? undefined,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      targetId: rec.targetId,
    });
  }

  async save(attachment: Attachment): Promise<Attachment> {
    const data = {
      id: attachment.id,
      name: attachment.name,
      type: attachment.type,
      dataUrl: attachment.dataUrl,
      targetId: attachment.targetId,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    } as const;

    const upserted = await this.prisma.attachment.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        type: data.type,
        dataUrl: data.dataUrl,
        targetId: data.targetId,
        updatedAt: new Date(),
      },
      create: data,
    });

    return this.toDomain(upserted);
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
    const items = await this.prisma.attachment.findMany({ where: { targetId } });
    return items.map((r) => this.toDomain(r));
  }

  async countByTargetId(targetId: string): Promise<number> {
    return this.prisma.attachment.count({ where: { targetId } });
  }

  async removeByTargetId(targetId: string): Promise<Attachment[]> {
    const existing = await this.prisma.attachment.findMany({ where: { targetId } });
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
    update: Partial<Pick<Attachment, 'name' | 'type' | 'dataUrl' | 'targetId'>>,
  ): Promise<Attachment> {
    const data: Record<string, any> = {};
    if (typeof update.name !== 'undefined') data.name = update.name;
    if (typeof update.type !== 'undefined') data.type = update.type;
    if (typeof update.dataUrl !== 'undefined') data.dataUrl = update.dataUrl;
    if (typeof update.targetId !== 'undefined') data.targetId = update.targetId;
    data.updatedAt = new Date();

    const rec = await this.prisma.attachment.update({ where: { id }, data });
    return this.toDomain(rec);
  }
}
