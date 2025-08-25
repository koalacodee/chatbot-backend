import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterGuestUseCase } from './application/use-cases/register-guest.use-case';
import { LoginGuestUseCase } from './application/use-cases/login-guest.use-case';
import { VerifyLoginUseCase } from './application/use-cases/verify-login.use-case';
import { VerifyRegisterUseCase } from './application/use-cases/verify-register.use-case';
import { GetAuthorizedUserUseCase } from './application/use-cases/get-authorized-user.use-case';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { RefreshTokenStrategy } from './infrastructure/strategies/refresh-token.strategy';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
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
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RegisterGuestUseCase,
    LoginGuestUseCase,
    VerifyLoginUseCase,
    VerifyRegisterUseCase,
    GetAuthorizedUserUseCase,
    JwtStrategy,
    RefreshTokenStrategy,
    TokenService,
  ],
  exports: [JwtModule, TokenService],
  controllers: [AuthController],
})
export class AuthModule {}
