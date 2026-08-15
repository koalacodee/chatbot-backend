import { Injectable, NotFoundException } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { randomInt } from 'crypto';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { ResendEmailService } from 'src/shared/infrastructure/email';
import TwoFactorEmail from 'src/shared/infrastructure/email/TwoFactorEmail';
import { RedisService } from 'src/shared/infrastructure/redis';
import {
  GUEST_VERIFICATION_CODE_TTL_SECONDS,
  loginKey,
} from '../guest-verification.constants';

interface LoginGuestInput {
  identifier: string;
}

@Injectable()
export class LoginGuestUseCase {
  constructor(
    private readonly guestRepo: GuestRepository,
    private readonly email: ResendEmailService,
    private readonly redis: RedisService,
  ) {}

  async execute({ identifier }: LoginGuestInput) {
    const guest = await (isEmail(identifier)
      ? this.guestRepo.findByEmail(identifier)
      : this.guestRepo.findByPhone(identifier));
    if (!guest) {
      throw new NotFoundException({
        details: [{ field: 'identifier', message: 'Guest not found' }],
      });
    }
    const code = randomInt(100000, 1000000).toString();
    await Promise.all([
      this.redis.set(
        loginKey(guest.id.toString()),
        code,
        GUEST_VERIFICATION_CODE_TTL_SECONDS,
      ),
      this.email.sendReactEmail<{ name: string; code: string }>(
        guest.email.getValue(),
        'Verify your login',
        TwoFactorEmail,
        { name: guest.name, code },
      ),
    ]);

    // The caller needs the id to redeem the code; identifier lookup already discloses
    // whether the account exists, so this reveals nothing new.
    return { message: 'Code Sent Successfully!', guestId: guest.id.toString() };
  }
}
