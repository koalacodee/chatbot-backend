import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GuestJwtStrategy extends PassportStrategy(Strategy, 'guest-jwt') {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('GUEST_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: any) {
    // Only handle guest tokens
    if (payload.role !== 'guest') {
      throw new UnauthorizedException('Non-guest tokens not accepted');
    }

    const guest = await this.guestRepository.findById(payload.sub);

    if (!guest) {
      throw new UnauthorizedException('Guest not found');
    }

    // Return guest data that will be attached to the request object
    return {
      id: guest.id,
      email: guest.email.toString(),
      role: Roles.GUEST,
    };
  }
}
