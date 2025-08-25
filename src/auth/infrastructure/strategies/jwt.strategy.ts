import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly guestRepository: GuestRepository,
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
    let userOrGuest;
    if (payload.role === 'guest') {
      userOrGuest = await this.guestRepository.findById(payload.sub);
    } else {
      userOrGuest = await this.userRepository.findById(payload.sub);
    }

    // Return user data that will be attached to the request object
    return {
      id: userOrGuest.id,
      email: userOrGuest.email.toString(),
      role: payload.role === 'guest' ? Roles.GUEST : userOrGuest.role,
    };
  }
}
