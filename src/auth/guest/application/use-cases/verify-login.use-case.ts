import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import {
  attemptKey,
  codesMatch,
  GUEST_VERIFICATION_CODE_TTL_SECONDS,
  loginKey,
  MAX_VERIFICATION_ATTEMPTS,
} from '../guest-verification.constants';

@Injectable()
export class VerifyLoginUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly tokenService: TokensService,
    private readonly guestRepo: GuestRepository,
  ) {}

  /**
   * The code is stored against the guest, so redeeming it takes both the id (returned by
   * `login`) and the emailed code. Every failure returns the same message so a caller
   * cannot tell an unknown guest from a wrong code.
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
      // Burn the code rather than leaving it live for the remainder of its window.
      await this.redis.del(loginKey(guestId));
      throw invalidCode();
    }

    const expected = await this.redis.get(loginKey(guestId));

    if (!expected || !codesMatch(code, expected)) throw invalidCode();

    await Promise.all([
      this.redis.del(loginKey(guestId)),
      this.redis.del(attemptKey(guestId)),
    ]);

    // The code is already burned, so a guest deleted in the meantime has to read as an
    // unusable code rather than a TypeError on `.toJSON()`.
    const guest = await this.guestRepo.findById(guestId);

    if (!guest) throw invalidCode();

    const guestData = guest.toJSON();

    const tokens = await this.tokenService.generateTokens(
      guestData.id,
      guestData.email,
    );

    return { guest: guestData, tokens };
  }
}
