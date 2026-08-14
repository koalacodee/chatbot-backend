import { Module } from '@nestjs/common';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { DrizzleRefreshTokenRepository } from './infrastructure/repositories/drizzle-refresh-token.repository';
import { GuestAuthModule } from './guest/guest.module';
import { UserAuthModule } from './user/user.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    forwardRef(() => GuestAuthModule),
    forwardRef(() => UserAuthModule),
  ],
  providers: [
    { provide: RefreshTokenRepository, useClass: DrizzleRefreshTokenRepository },
  ],
  exports: [RefreshTokenRepository],
})
export class AuthModule {}
