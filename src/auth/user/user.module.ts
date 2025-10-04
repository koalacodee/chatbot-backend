import { forwardRef, Module } from '@nestjs/common';
import * as UseCases from './application/use-cases';
import { UserAuthController } from './interface/http/user.controller';
import { TokensService } from '../domain/services/tokens.service';
import { JwtTokensService } from './infrastructure/services/jwt-token.service';
import { AuthModule } from '../auth.module';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { RefreshTokenStrategy } from './infrastructure/strategies/refresh-token.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserJwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { UserRefreshTokenGuard } from './infrastructure/guards/refresh-token.guard';
@Module({
  providers: [
    ...Object.values(UseCases),
    {
      provide: TokensService,
      useClass: JwtTokensService,
    },
    JwtStrategy,
    RefreshTokenStrategy,
    UserJwtAuthGuard,
    UserRefreshTokenGuard,
  ],
  controllers: [UserAuthController],
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('USER_ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  exports: [UserJwtAuthGuard, UserRefreshTokenGuard, TokensService],
})
export class UserAuthModule {}
