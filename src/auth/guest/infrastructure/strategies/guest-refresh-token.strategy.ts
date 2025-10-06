import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { FastifyRequest } from 'fastify';

// Custom extractor function to get JWT from cookies
const cookieExtractor = (req: FastifyRequest): string | null => {
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

  async validate(req: FastifyRequest, payload: any) {
    const refreshToken = req.cookies['guest_refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Guest refresh token not found' },
        ],
      });
    }

    // Only handle guest tokens
    if (payload.role !== 'guest') {
      throw new UnauthorizedException({
        details: [
          {
            field: 'refreshToken',
            message: 'Non-guest refresh tokens not accepted',
          },
        ],
      });
    }

    // Verify that the refresh token exists in the database and hasn't been revoked
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Invalid guest refresh token' },
        ],
      });
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException({
        details: [
          {
            field: 'refreshToken',
            message: 'Guest refresh token has been revoked',
          },
        ],
      });
    }

    if (storedToken.isExpired) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Guest refresh token has expired' },
        ],
      });
    }

    // Verify the token belongs to the guest in the payload
    if (storedToken.targetId.toString() !== payload.sub) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Invalid guest token owner' },
        ],
      });
    }

    const guest = await this.guestRepository.findById(payload.sub);

    if (!guest) {
      throw new UnauthorizedException({
        details: [{ field: 'guestId', message: 'Guest not found' }],
      });
    }

    return {
      id: guest.id.toString(),
      email: guest.email.toString(),
      role: 'guest',
      refreshToken,
    };
  }
}
