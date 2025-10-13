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
      userId: rec.userId,
      guestId: rec.guestId,
      isGlobal: rec.isGlobal,
      size: rec.size,
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
      userId: attachment.userId,
      guestId: attachment.guestId,
      isGlobal: attachment.isGlobal,
      size: attachment.size,
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
        userId: data.userId,
        guestId: data.guestId,
        isGlobal: data.isGlobal,
        size: data.size,
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

  async findByIds(ids: string[]): Promise<Attachment[]> {
    const items = await this.prisma.attachment.findMany({
      where: { id: { in: ids } },
    });
    return items.map((r) => this.toDomain(r));
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

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Attachment[]> {
    const items = await this.prisma.attachment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return items.map((r) => this.toDomain(r));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.attachment.count({ where: { userId } });
  }

  async findGlobalAttachments(limit = 50, offset = 0): Promise<Attachment[]> {
    const items = await this.prisma.attachment.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return items.map((r) => this.toDomain(r));
  }

  async countGlobalAttachments(): Promise<number> {
    return this.prisma.attachment.count({ where: { isGlobal: true } });
  }

  async findUserAndGlobalAttachments(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Attachment[]> {
    const items = await this.prisma.attachment.findMany({
      where: {
        OR: [
          { userId }, // User's attachments
          { isGlobal: true }, // Global attachments
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        // contentType: true,
        expirationDate: true,
        // fileType: true,
        id: true,
        isGlobal: true,
        originalName: true,
        type: true,
        targetId: true,
        size: true,
      },
    });
    return items.map((r) => this.toDomain(r));
  }

  async countUserAndGlobalAttachments(userId: string): Promise<number> {
    return this.prisma.attachment.count({
      where: {
        OR: [
          { userId }, // User's attachments
          { isGlobal: true }, // Global attachments
        ],
      },
    });
  }

  async update(
    id: string,
    update: Partial<
      Pick<
        Attachment,
        | 'type'
        | 'filename'
        | 'originalName'
        | 'expirationDate'
        | 'targetId'
        | 'userId'
        | 'guestId'
        | 'isGlobal'
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
    if (typeof update.userId !== 'undefined') data.userId = update.userId;
    if (typeof update.guestId !== 'undefined') data.guestId = update.guestId;
    if (typeof update.isGlobal !== 'undefined') data.isGlobal = update.isGlobal;
    data.updatedAt = new Date();

    const rec = await this.prisma.attachment.update({ where: { id }, data });
    return this.toDomain(rec);
  }
}
