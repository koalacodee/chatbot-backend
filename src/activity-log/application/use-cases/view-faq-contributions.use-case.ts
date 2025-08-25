import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

export interface ViewFaqContributionsInputDto {
  userId?: string;
}

export interface FaqContributionRowDto {
  id: string;
  title: string;
  action: 'CREATED' | 'UPDATED';
  departmentName: string | null;
  date: Date;
  user?: { id: string; name: string };
}

@Injectable()
export class ViewFaqContributionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: ViewFaqContributionsInputDto,
  ): Promise<FaqContributionRowDto[]> {
    const created = await this.prisma.question.findMany({
      where: {
        OR: [
          {
            creatorAdminId: input.userId ? { equals: input.userId } : undefined,
          },
          {
            creatorSupervisorId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
          {
            creatorEmployeeId: input.userId
              ? { equals: input.userId }
              : undefined,
          },
        ],
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        department: { select: { name: true } },
        creatorAdmin: {
          select: { id: true, user: { select: { name: true } } },
        },
        creatorSupervisor: {
          select: { id: true, user: { select: { name: true } } },
        },
        creatorEmployee: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return created.map((q) => ({
      id: q.id,
      title: q.text,
      action: 'CREATED' as const,
      departmentName: q.department?.name ?? null,
      date: q.createdAt,
      user: input.userId
        ? undefined
        : q.creatorAdmin
          ? { id: q.creatorAdmin.id, name: q.creatorAdmin.user.name }
          : q.creatorEmployee
            ? { id: q.creatorEmployee.id, name: q.creatorEmployee.user.name }
            : q.creatorSupervisor
              ? {
                  id: q.creatorSupervisor.id,
                  name: q.creatorSupervisor.user.name,
                }
              : undefined,
    }));
  }
}
