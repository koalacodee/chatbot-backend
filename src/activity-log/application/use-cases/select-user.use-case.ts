import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { User } from 'src/shared/entities/user.entity';

export interface SelectUserInputDto {
  userId?: string;
}

export interface SelectUserOutputDto {
  selectedUser: User | null;
}

@Injectable()
export class SelectUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: SelectUserInputDto): Promise<SelectUserOutputDto> {
    if (!input.userId) return { selectedUser: null };
    const row = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    const selectedUser = row
      ? await User.create(
          {
            id: row.id,
            name: row.name,
            email: row.email,
            password: row.password,
            role: row.role as any,
            username: row.username,
          },
          false,
        )
      : null;
    return { selectedUser };
  }
}
