import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface ViewPromotionsCreatedInputDto {
  userId?: string;
}

export interface PromotionCreatedRowDto {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  user?: { id: string; name: string };
}

@Injectable()
export class ViewPromotionsCreatedUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ViewPromotionsCreatedInputDto,
  ): Promise<PromotionCreatedRowDto[]> {
    const rows = await this.prisma.promotion.findMany({
      where: {
        OR: [
          {
            createdByAdminId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
          {
            createdBySupervisorId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
        ],
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        createdAt: true,
        createdByAdmin: {
          select: { id: true, user: { select: { name: true } } },
        },
        createdBySupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      isActive: p.isActive,
      createdAt: p.createdAt,
      user: input.userId
        ? undefined
        : p.createdByAdmin
          ? { id: p.createdByAdmin.id, name: p.createdByAdmin.user.name }
          : p.createdBySupervisor
            ? {
                id: p.createdBySupervisor.id,
                name: p.createdBySupervisor.user.name,
              }
            : undefined,
    }));
  }
}
