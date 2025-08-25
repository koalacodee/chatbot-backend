import { BadRequestException, Injectable } from '@nestjs/common';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { TokenService } from '../../infrastructure/services/token.service';

@Injectable()
export class VerifyRegisterUseCase {
  constructor(
    private readonly guestRepo: GuestRepository,
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(code: string) {
    const guest = await this.redis.get(`guest:${code}:reg`).then((val) => {
      if (!val) {
        throw new BadRequestException({ code: 'code_incorrect' });
      }

      return Guest.fromJSON(JSON.parse(val));
    });
    await Promise.all([
      this.guestRepo.save(guest),
      this.redis.del(`guest:${code}:reg`),
    ]);
    const { password, ...userData } = guest.toJSON();
    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      userData.id,
      userData.email,
      'guest',
    );
    return { guest: userData, tokens };
  }
}
