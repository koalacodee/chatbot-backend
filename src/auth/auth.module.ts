import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UserRepository } from '../shared/repositories/user.repository';
import { PrismaUserRepository } from '../shared/infrastructure/repositories/prisma-user.repository';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { RefreshTokenStrategy } from './infrastructure/strategies/refresh-token.strategy';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { TokenService } from './infrastructure/services/token.service';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { AuthController } from './interface/http/auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('ACCESS_JWT_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    JwtStrategy,
    RefreshTokenStrategy,
    TokenService,
  ],
  exports: [UserRepository, JwtModule, TokenService],
  controllers: [AuthController],
})
export class AuthModule {}
