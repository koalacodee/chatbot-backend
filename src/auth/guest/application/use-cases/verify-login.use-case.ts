import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { TokensService } from 'src/auth/domain/services/tokens.service';

@Injectable()
export class VerifyLoginUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly tokenService: TokensService,
    private readonly guestRepo: GuestRepository,
  ) {}

  async execute(code: string) {
    const guestId = await this.redis.get(`guest:${code}:login`).then((val) => {
      if (!val) {
        throw new BadRequestException({ code: 'code_incorrect' });
      }

      return val;
    });
    await this.redis.del(`guest:${code}:login`);
    const { password, ...guestData } = (
      await this.guestRepo.findById(guestId)
    ).toJSON();
    // Generate guest-specific tokens
    const tokens = await this.tokenService.generateTokens(
      guestData.id,
      guestData.email,
    );
    return { guest: guestData, tokens };
  }
}
