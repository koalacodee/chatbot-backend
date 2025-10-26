import { Injectable, NotFoundException } from '@nestjs/common';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { ResetPasswordEmail } from 'src/shared/infrastructure/email/ResetPasswordEmail';
import { randomInt } from 'crypto';

interface SendResetPasswordCodeInput {
  email: string;
}

@Injectable()
export class SendResetPasswordCodeUseCase {
  private readonly RESET_CODE_PREFIX = 'reset_password_code:';
  private readonly RESET_CODE_EXPIRY_SECONDS = 15 * 60; // 15 minutes

  constructor(
    private readonly userRepo: UserRepository,
    private readonly redisService: RedisService,
    private readonly emailService: ResendEmailService,
  ) {}

  async execute(
    input: SendResetPasswordCodeInput,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(input.email);

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'email', message: 'User not found' }],
      });
    }

    // Generate 8-digit code
    const resetCode = randomInt(10000000, 100000000).toString();

    // Store code in Redis with user ID as value
    const key = `${this.RESET_CODE_PREFIX}${resetCode}`;
    await this.redisService.set(key, user.id, this.RESET_CODE_EXPIRY_SECONDS);

    // Send email with reset code using React template
    const subject = 'Reset Your Password';

    await this.emailService.sendReactEmail(
      input.email,
      subject,
      ResetPasswordEmail,
      {
        name: user.username || 'User',
        code: resetCode,
      },
    );

    return {
      message: 'Reset password code sent to your email',
    };
  }
}
