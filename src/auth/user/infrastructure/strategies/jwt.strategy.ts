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

    // Only handle authenticated users (not guests)
    const user = await this.userRepository.findById(payload.sub);

    console.log(user);

    if (!user) {
      throw new UnauthorizedException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    // Return user data that will be attached to the request object
    return {
      id: user.id.toString(),
      email: user.email.toString(),
      role: user.role.toString(),
      permissions: payload.permissions,
    };
  }
}
