import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(refreshToken: RefreshToken): Promise<void> {
    console.log(refreshToken.toJSON());

    await this.prisma.refreshToken.create({
      data: refreshToken.toJSON(),
    });
  }

  async findByToken(token: string) {
    return this.mapToDomain(
      await this.prisma.refreshToken.findUnique({
        where: { token },
      }),
    );
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async revokeToken(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  private mapToDomain(refreshToken: PrismaRefreshToken): RefreshToken {
    const { createdAt, revokedAt, ...rest } = refreshToken;
    return new RefreshToken({ ...rest, isRevoked: !!revokedAt });
  }
}
