import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProfileRepository } from '../../domain/repositories/profile.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';

export interface VerifyProfilePasswordResetOTPRequest {
  userId: string;
  code: string;
  newPassword: string;
}

export interface VerifyProfilePasswordResetOTPResponse {
  success: boolean;
  message: string;
}

@Injectable()
export class VerifyProfilePasswordResetOTPUseCase {
  private readonly RESET_CODE_PREFIX = 'profile_reset_password_code:';

  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) { }

  async execute(
    request: VerifyProfilePasswordResetOTPRequest,
  ): Promise<VerifyProfilePasswordResetOTPResponse> {
    // Verify user exists
    const user = await this.userRepository.findById(request.userId, {
      includeEntity: false,
    });

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    // Get user ID from Redis using the code
    // The key format is: profile_reset_password_code:userId:code
    const key = `${this.RESET_CODE_PREFIX}${request.userId}:${request.code}`;
    const storedUserId = await this.redisService.get(key);

    if (!storedUserId) {
      throw new BadRequestException({
        details: [
          { field: 'code', message: 'Invalid or expired reset code' },
        ],
      });
    }

    if (storedUserId !== request.userId) {
      throw new BadRequestException({
        details: [
          { field: 'code', message: 'You are not authorized to reset this password' },
        ],
      });
    }

    // Update user's password using ProfileRepository
    await this.profileRepository.updateProfile(request.userId, {
      password: request.newPassword,
    });

    // Delete the reset code from Redis
    await this.redisService.del(key);

    return {
      success: true,
      message: 'Password has been successfully updated',
    };
  }
}

