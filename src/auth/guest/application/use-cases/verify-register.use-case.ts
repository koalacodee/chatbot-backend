import { BadRequestException, Injectable } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import {
  attemptKey,
  codesMatch,
  GUEST_VERIFICATION_CODE_TTL_SECONDS,
  MAX_VERIFICATION_ATTEMPTS,
  registrationKey,
} from '../guest-verification.constants';

@Injectable()
export class VerifyRegisterUseCase {
  constructor(
    private readonly guestRepo: GuestRepository,
    private readonly redis: RedisService,
    private readonly tokenService: TokensService,
  ) {}

  /**
   * The pending registration is stored against the guest, so redeeming it takes both the
   * id (returned by `register`) and the emailed code. Every failure returns the same
   * message so a caller cannot tell an unknown guest from a wrong code.
   */
  async execute(guestId: string, code: string) {
    const invalidCode = () =>
      new BadRequestException({
        details: [{ field: 'code', message: 'Code is incorrect' }],
      });

    const attempts = await this.redis.increment(
      attemptKey(guestId),
      GUEST_VERIFICATION_CODE_TTL_SECONDS,
    );

    if (attempts > MAX_VERIFICATION_ATTEMPTS) {
      await this.redis.del(registrationKey(guestId));
      throw invalidCode();
    }

    const stored = await this.redis.get(registrationKey(guestId));

    if (!stored) throw invalidCode();

    const payload = JSON.parse(stored) as {
      code: string;
      guest: Record<string, any>;
    };

    if (!codesMatch(code, payload.code)) throw invalidCode();

    const guest = Guest.fromJSON(payload.guest as any);

    await Promise.all([
      this.guestRepo.save(guest),
      this.redis.del(registrationKey(guestId)),
      this.redis.del(attemptKey(guestId)),
    ]);

    const userData = guest.toJSON();

    const tokens = await this.tokenService.generateTokens(
      userData.id,
      userData.email,
    );

    return { guest: userData, tokens };
  }
}
