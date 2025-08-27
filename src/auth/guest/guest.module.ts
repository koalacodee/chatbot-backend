import { forwardRef, Global, Module } from '@nestjs/common';
import { JwtTokenService } from './infrastructure/services/jwt-tokens.service';
import { GuestJwtStrategy } from './infrastructure/strategies/guest-jwt.strategy';
import { GuestRefreshTokenStrategy } from './infrastructure/strategies/guest-refresh-token.strategy';
import * as UseCases from './application/use-cases';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokensService } from '../domain/services/tokens.service';
import { AuthModule } from '../auth.module';
import { GuestController } from './interface/http/guest.controller';
@Global()
@Module({
  providers: [
    {
      provide: TokensService,
      useClass: JwtTokenService,
    },
    GuestJwtStrategy,
    GuestRefreshTokenStrategy,
    ...Object.values(UseCases),
  ],
  exports: [TokensService],
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('GUEST_ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [GuestController],
})
export class GuestAuthModule {}
