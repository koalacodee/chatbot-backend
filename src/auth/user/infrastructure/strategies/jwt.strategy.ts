import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from 'src/shared/repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('USER_ACCESS_TOKEN_SECRET'), // Use environment variable in production
    });
  }

  async validate(payload: any) {
    // Reject guest tokens
    if (payload.role === 'guest') {
      throw new UnauthorizedException({
        details: [{ field: 'token', message: 'Guest tokens not accepted' }],
      });
    }

    // `includeEntity` joins the four role rows on a unique user_id, so it cannot fan out
    // — one extra query only when the user turns out to be a supervisor.
    const user = await this.userRepository.findById(payload.sub, {
      includeEntity: true,
    });

    if (!user) {
      throw new UnauthorizedException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    // Read from the database, not from `payload.permissions`. Trusting the claim meant a
    // revoked permission stayed usable until the access token turned over, and left the
    // request carrying a role sourced from the database beside permissions sourced from
    // the token — two views of the same account that could disagree.
    return {
      id: user.id.toString(),
      email: user.email.toString(),
      role: user.role.toString(),
      permissions:
        user.supervisor?.permissions ?? user.employee?.permissions ?? [],
    };
  }
}
