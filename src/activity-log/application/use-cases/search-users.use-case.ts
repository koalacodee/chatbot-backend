import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from 'src/shared/entities/user.entity';
import { UserRole } from '@prisma/client';

export interface SearchUsersInputDto {
  searchQuery: string;
}

@Injectable()
export class SearchUsersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: SearchUsersInputDto): Promise<User[]> {
    const q = input.searchQuery?.trim();
    const rows = await this.prisma.user.findMany({
      where: {
        AND: [
          { role: { in: [UserRole.EMPLOYEE, UserRole.SUPERVISOR] } },
          q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  { id: q },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
    });
    return Promise.all(
      rows.map((r) =>
        User.create(
          {
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            role: r.role as any, // domain accepts underlying enum when skipValidation = false
            username: r.username,
            employeeId: r.employeeId,
            jobTitle: r.jobTitle,
          },
          false,
        ),
      ),
    );
  }
}
