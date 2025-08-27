import { Module } from '@nestjs/common';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { GuestAuthModule } from './guest/guest.module';
import { UserAuthModule } from './user/user.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    forwardRef(() => GuestAuthModule),
    forwardRef(() => UserAuthModule),
  ],
  providers: [
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
  ],
  exports: [RefreshTokenRepository],
})
export class AuthModule {}
