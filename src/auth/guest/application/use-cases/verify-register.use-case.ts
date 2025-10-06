import { BadRequestException, Injectable } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { RedisService } from 'src/shared/infrastructure/redis';

@Injectable()
export class VerifyRegisterUseCase {
  constructor(
    private readonly guestRepo: GuestRepository,
    private readonly redis: RedisService,
    private readonly tokenService: TokensService,
  ) {}

  async execute(code: string) {
    const guest = await this.redis.get(`guest:${code}:reg`).then((val) => {
      if (!val) {
        throw new BadRequestException({
          details: [{ field: 'code', message: 'Code is incorrect' }],
        });
      }

      return Guest.fromJSON(JSON.parse(val));
    });
    await Promise.all([
      this.guestRepo.save(guest),
      this.redis.del(`guest:${code}:reg`),
    ]);
    const userData = guest.toJSON();
    // Generate guest-specific tokens
    const tokens = await this.tokenService.generateTokens(
      userData.id,
      userData.email,
    );
    return { guest: userData, tokens };
  }
}
