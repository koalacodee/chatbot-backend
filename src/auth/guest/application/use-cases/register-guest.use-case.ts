import { ConflictException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { ResendEmailService } from 'src/shared/infrastructure/email';
import TwoFactorEmail from 'src/shared/infrastructure/email/TwoFactorEmail';
import { RedisService } from 'src/shared/infrastructure/redis';
import {
  GUEST_VERIFICATION_CODE_TTL_SECONDS,
  registrationKey,
} from '../guest-verification.constants';

interface RegisterGuestUseCaseProps {
  name: string;
  email: string;
  phone?: string;
}

@Injectable()
export class RegisterGuestUseCase {
  constructor(
    private readonly guestRepo: GuestRepository,
    private readonly redis: RedisService,
    private readonly email: ResendEmailService,
  ) {}

  async execute({ name, email, phone }: RegisterGuestUseCaseProps) {
    const [existsByEmail, existsByPhone] = await Promise.all([
      this.guestRepo.existsByEmail(email),
      phone ? this.guestRepo.existsByPhone(phone) : false,
    ]);

    if (existsByEmail) {
      throw new ConflictException({
        details: [{ field: 'email', message: 'Email already exists' }],
      });
    }

    if (existsByPhone) {
      throw new ConflictException({
        details: [{ field: 'phone', message: 'Phone number already exists' }],
      });
    }

    const guest = Guest.create({
      name,
      email,
      phone,
    });

    const code = randomInt(100000, 1000000).toString();
    await Promise.all([
      // Keyed by guest, with the code stored as part of the payload — see
      // registrationKey() for why the code cannot be the key.
      this.redis.set(
        registrationKey(guest.id.value),
        JSON.stringify({ code, guest: guest.toJSON() }),
        GUEST_VERIFICATION_CODE_TTL_SECONDS,
      ),
      this.email.sendReactEmail<{ name: string; code: string }>(
        email,
        'Verify your email',
        TwoFactorEmail,
        { name, code },
      ),
    ]);

    return { guest: guest.withoutPassword() };
  }
}
