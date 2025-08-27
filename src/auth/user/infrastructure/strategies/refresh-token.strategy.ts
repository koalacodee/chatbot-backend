import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository';

// Custom extractor function to get JWT from cookies
const cookieExtractor = (req: Request): string | null => {
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

  async validate(req: Request, payload: any) {
    const refreshToken = req.cookies['refresh_token'];

    console.log(refreshToken);

    if (!refreshToken) {
      console.log('Refresh token not found');

      throw new UnauthorizedException('Refresh token not found');
    }

    // Reject guest tokens
    if (payload.role === 'guest') {
      throw new UnauthorizedException('Guest refresh tokens not accepted');
    }

    // Verify that the refresh token exists in the database and hasn't been revoked
    const storedToken =
      await this.refreshTokenRepository.findByToken(refreshToken);

    console.log(storedToken);

    if (!storedToken) {
      console.log('Invalid refresh token');

      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked) {
      console.log('Refresh token has been revoked');

      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.isExpired) {
      console.log('Refresh token has expired');

      throw new UnauthorizedException('Refresh token has expired');
    }

    // Verify the token belongs to the user in the payload
    if (storedToken.targetId.toString() !== payload.sub) {
      console.log('Invalid token owner');

      throw new UnauthorizedException('Invalid token owner');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      console.log('User not found');

      throw new UnauthorizedException('user_not_found');
    }

    return {
      id: user.id,
      email: user.email.toString(),
      role: user.role.toString(),
      refreshToken,
    };
  }
}
