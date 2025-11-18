import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AttachmentGroupRepository } from '../../domain/repositories/attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';

@Injectable()
export class PrismaAttachmentGroupRepository extends AttachmentGroupRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(record: any): AttachmentGroup {
    return AttachmentGroup.create({
      id: record.id,
      createdById: record.createdById,
      key: record.key,
      ips: record.ips || [],
      attachmentIds: record.attachments?.map((a: any) => a.id) || [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      expiresAt: record.expiresAt
    });
  }

  async save(attachmentGroup: AttachmentGroup): Promise<AttachmentGroup> {
    const data = {
      id: attachmentGroup.id,
      createdById: attachmentGroup.createdById,
      key: attachmentGroup.key,
      ips: attachmentGroup.ips,
      createdAt: attachmentGroup.createdAt,
      updatedAt: attachmentGroup.updatedAt,
      expiresAt: attachmentGroup.expiresAt
    };

    const attachmentIds = attachmentGroup.attachmentIds;

    const upsert = await this.prisma.attachmentGroup.upsert({
      where: { id: data.id },
      update: {
        key: data.key,
        ips: data.ips,
        updatedAt: new Date(),
        attachments: {
          set: attachmentIds.map((id) => ({ id })),
        },
        expiresAt: data.expiresAt
      },
      create: {
        ...data,
        attachments: {
          connect: attachmentIds.map((id) => ({ id })),
        },
        expiresAt: data.expiresAt
      },
      include: {
        attachments: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<AttachmentGroup | null> {
    const record = await this.prisma.attachmentGroup.findUnique({
      where: { id },
      include: {
        attachments: true,
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByKey(key: string): Promise<AttachmentGroup | null> {
    const record = await this.prisma.attachmentGroup.findFirst({
      where: { key },
      include: {
        attachments: true,
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCreatedById(
    createdById: string,
    limit = 50,
    offset = 0,
  ): Promise<AttachmentGroup[]> {
    const records = await this.prisma.attachmentGroup.findMany({
      where: { createdById },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return records.map((record) => this.toDomain(record));
  }

  async countByCreatedById(createdById: string): Promise<number> {
    return this.prisma.attachmentGroup.count({ where: { createdById } });
  }

  async removeById(id: string): Promise<AttachmentGroup | null> {
    const record = await this.findById(id);
    if (!record) return null;

    await this.prisma.attachmentGroup.delete({ where: { id } });
    return record;
  }

  async update(
    id: string,
    update: Partial<Pick<AttachmentGroup, 'key' | 'ips' | 'attachmentIds' | 'expiresAt'>>,
  ): Promise<AttachmentGroup> {
    const data: Record<string, any> = {};

    if (update.key !== undefined) data.key = update.key;
    if (update.ips !== undefined) data.ips = update.ips;
    if (update.expiresAt !== undefined) data.expiresAt = update.expiresAt;
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (update.attachmentIds !== undefined) {
      updateData.attachments = {
        set: update.attachmentIds.map((id) => ({ id })),
      };
    }

    const record = await this.prisma.attachmentGroup.update({
      where: { id },
      data: updateData,
      include: {
        attachments: true,
      },
    });

    return this.toDomain(record);
  }
}
