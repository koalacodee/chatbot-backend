import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { RedisService } from 'src/shared/infrastructure/redis';

@Injectable()
export class RequestMembershipUseCase {
  constructor(private readonly redis: RedisService) {}

  async execute() {
    // Generate a 6-digit length OTP
    const otp = randomInt(100000, 999999);

    // Store the OTP in Redis with an expiration time (e.g., 25 minutes)
    await this.redis.set(`attachment-group:membership:${otp}`, '1', 1500);

    return otp;
  }
}
