import { Injectable, NotFoundException } from '@nestjs/common';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { ProfilePasswordResetOTPEmail } from 'src/shared/infrastructure/email/ProfilePasswordResetOTPEmail';
import { randomInt } from 'crypto';

export interface SendProfilePasswordResetOTPRequest {
  userId: string;
}

export interface SendProfilePasswordResetOTPResponse {
  message: string;
}

@Injectable()
export class SendProfilePasswordResetOTPUseCase {
  private readonly RESET_CODE_PREFIX = 'profile_reset_password_code:';
  private readonly RESET_CODE_EXPIRY_SECONDS = 15 * 60; // 15 minutes

  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
    private readonly emailService: ResendEmailService,
  ) { }

  async execute(
    request: SendProfilePasswordResetOTPRequest,
  ): Promise<SendProfilePasswordResetOTPResponse> {
    // Get user from database
    const user = await this.userRepository.findById(request.userId, {
      includeEntity: false,
    });

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    // Generate 8-digit OTP code
    const resetCode = randomInt(10000000, 100000000).toString();

    // Store code in Redis with user ID as value
    // Use userId:code format to ensure the code is tied to the requesting user
    const key = `${this.RESET_CODE_PREFIX}${request.userId}:${resetCode}`;
    await this.redisService.set(key, request.userId, this.RESET_CODE_EXPIRY_SECONDS);

    // Send email with reset code using React template
    const subject = 'Password Reset OTP - Update Your Password';

    await this.emailService.sendReactEmail(
      user.email.toString(),
      subject,
      ProfilePasswordResetOTPEmail,
      {
        name: user.name || user.username || 'User',
        code: resetCode,
      },
    );

    return {
      message: 'Password reset OTP sent to your email',
    };
  }
}

