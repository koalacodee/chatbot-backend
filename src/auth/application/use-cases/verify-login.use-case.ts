import { BadRequestException, Injectable } from '@nestjs/common';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { RedisService } from 'src/shared/infrastructure/redis';
import { TokenService } from '../../infrastructure/services/token.service';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';

@Injectable()
export class VerifyLoginUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
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
    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      guestData.id,
      guestData.email,
      'guest',
    );
    return { guest: guestData, tokens };
  }
}
