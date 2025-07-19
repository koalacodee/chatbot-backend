import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from 'src/shared/repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('ACCESS_JWT_SECRET'), // Use environment variable in production
    });
  }

  async validate(payload: any) {
    // payload typically contains user information from the JWT token
    // such as sub (subject/userId), email, role, etc.
    const user = await this.userRepository.findById(payload.sub);

    // Return user data that will be attached to the request object
    return {
      id: user.id,
      email: user.email.toString(),
      role: user.role.toString(),
    };
  }
}
