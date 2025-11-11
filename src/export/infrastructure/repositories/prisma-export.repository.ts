import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ExportRepository } from '../../domain/repositories/export.repository';
import { Export, ExportType } from '../../domain/entities/export.entity';

@Injectable()
export class PrismaExportRepository extends ExportRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(exportRow: any): Export {
    return Export.create({
      id: exportRow.id,
      type: exportRow.type as ExportType,
      objectPath: exportRow.objectPath,
      size: exportRow.size,
      createdAt: exportRow.createdAt,
      updatedAt: exportRow.updatedAt,
      rows: exportRow.rows,
    });
  }

  async save(exportEntity: Export): Promise<Export> {
    const data = {
      id: exportEntity.id,
      type: exportEntity.type,
      objectPath: exportEntity.objectPath,
      size: exportEntity.size,
      rows: exportEntity.rows,
    };

    const upsert = await (this.prisma).export.upsert({
      where: { id: data.id },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: data,
    });

    return this.toDomain(upsert);
  }

  async saveMany(exports: Export[]): Promise<Export[]> {
    const data = exports.map((exportEntity) => ({
      id: exportEntity.id,
      type: exportEntity.type,
      objectPath: exportEntity.objectPath,
      size: exportEntity.size,
      rows: exportEntity.rows,
    }));

    const result = await this.prisma.$transaction(async (tx) => {
      const upsertExports = [];
      for (const exportData of data) {
        const upsert = await (tx).export.upsert({
          where: { id: exportData.id },
          update: {
            ...exportData,
            updatedAt: new Date(),
          },
          create: exportData,
        });
        upsertExports.push(upsert);
      }
      return upsertExports;
    });

    return result.map((exportRow) => this.toDomain(exportRow));
  }

  async findById(id: string): Promise<Export | null> {
    const exportRow = await (this.prisma).export.findUnique({
      where: { id },
    });

    return exportRow ? this.toDomain(exportRow) : null;
  }

  async findByIds(ids: string[]): Promise<Export[]> {
    const exports = await (this.prisma).export.findMany({
      where: { id: { in: ids } },
    });

    return exports.map((exportRow) => this.toDomain(exportRow));
  }

  async removeById(id: string): Promise<Export | null> {
    const exportEntity = await this.findById(id);
    if (!exportEntity) return null;

    await (this.prisma).export.delete({ where: { id } });
    return exportEntity;
  }

  async removeByIds(ids: string[]): Promise<Export[]> {
    const exports = await this.findByIds(ids);
    if (exports.length === 0) return [];

    await (this.prisma).export.deleteMany({
      where: { id: { in: ids } },
    });

    return exports;
  }

  async count(): Promise<number> {
    return (this.prisma).export.count();
  }

  async exists(id: string): Promise<boolean> {
    const count = await (this.prisma).export.count({ where: { id } });
    return count > 0;
  }

  async findAll(offset?: number, limit?: number): Promise<Export[]> {
    const exports = await (this.prisma).export.findMany({
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return exports.map((exportRow) => this.toDomain(exportRow));
  }
}

