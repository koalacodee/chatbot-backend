import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';

// Custom extractor function to get JWT from cookies
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['guest_refresh_token'] || null;
  }
  return null;
};

@Injectable()
export class GuestRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'guest-refresh-token',
) {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get('GUEST_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies['guest_refresh_token'];

    console.log('Guest refresh token:', refreshToken);

    if (!refreshToken) {
      console.log('Guest refresh token not found');
      throw new UnauthorizedException('Guest refresh token not found');
    }

    // Only handle guest tokens
    if (payload.role !== 'guest') {
      throw new UnauthorizedException('Non-guest refresh tokens not accepted');
    }

    // Verify that the refresh token exists in the database and hasn't been revoked
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshToken);

    console.log('Stored guest token:', storedToken);

    if (!storedToken) {
      console.log('Invalid guest refresh token');
      throw new UnauthorizedException('Invalid guest refresh token');
    }

    if (storedToken.isRevoked) {
      console.log('Guest refresh token has been revoked');
      throw new UnauthorizedException('Guest refresh token has been revoked');
    }

    if (storedToken.isExpired) {
      console.log('Guest refresh token has expired');
      throw new UnauthorizedException('Guest refresh token has expired');
    }

    // Verify the token belongs to the guest in the payload
    if (storedToken.targetId.toString() !== payload.sub) {
      console.log('Invalid guest token owner');
      throw new UnauthorizedException('Invalid guest token owner');
    }

    const guest = await this.guestRepository.findById(payload.sub);

    if (!guest) {
      console.log('Guest not found');
      throw new UnauthorizedException('guest_not_found');
    }

    return {
      id: guest.id.toString(),
      email: guest.email.toString(),
      role: 'guest',
      refreshToken,
    };
  }
}
