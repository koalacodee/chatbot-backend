import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';
import { FastifyRequest } from 'fastify';

// Custom extractor function to get JWT from cookies
const cookieExtractor = (req: FastifyRequest): string | null => {
  if (req && req.cookies) {
    return req.cookies['refresh_token'] || null;
  }
  return null;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: cookieExtractor, // Use cookie extractor instead of Authorization header
      ignoreExpiration: false,
      secretOrKey: config.get('USER_REFRESH_TOKEN_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: FastifyRequest, payload: any) {
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Refresh token not found' },
        ],
      });
    }

    // Reject guest tokens
    if (payload.role === 'guest') {
      throw new UnauthorizedException({
        details: [
          {
            field: 'refreshToken',
            message: 'Guest refresh tokens not accepted',
          },
        ],
      });
    }

    // Verify that the refresh token exists in the database and hasn't been revoked
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException({
        details: [{ field: 'refreshToken', message: 'Invalid refresh token' }],
      });
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Refresh token has been revoked' },
        ],
      });
    }

    if (storedToken.isExpired) {
      throw new UnauthorizedException({
        details: [
          { field: 'refreshToken', message: 'Refresh token has expired' },
        ],
      });
    }

    // Verify the token belongs to the user in the payload
    if (storedToken.targetId.toString() !== payload.sub) {
      throw new UnauthorizedException({
        details: [{ field: 'refreshToken', message: 'Invalid token owner' }],
      });
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    return {
      id: user.id.toString(),
      email: user.email.toString(),
      role: user.role.toString(),
      permissions: payload.permissions,
    };
  }
}
