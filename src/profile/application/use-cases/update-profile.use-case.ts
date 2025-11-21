import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from '../../domain/repositories/profile.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

export interface UpdateProfileRequest {
  userId: string;
  name?: string;
  username?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly userRepository: UserRepository,
  ) { }

  async execute(
    request: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    // Verify user exists
    const user = await this.userRepository.findById(request.userId, {
      includeEntity: false,
    });

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    // Check username uniqueness if username is being changed
    if (request.username !== undefined && request.username !== user.username) {
      const existingUserByUsername = await this.userRepository.findByUsername(
        request.username,
        { includeEntity: false },
      );

      if (existingUserByUsername && existingUserByUsername.id !== request.userId) {
        throw new ConflictException({
          details: [
            { field: 'username', message: 'Username already exists' },
          ],
        });
      }
    }

    // Check email uniqueness if email is being changed
    if (request.email !== undefined && request.email !== user.email.toString()) {
      const existingUserByEmail = await this.userRepository.findByEmail(
        request.email,
        { includeEntity: false },
      );

      if (existingUserByEmail && existingUserByEmail.id !== request.userId) {
        throw new ConflictException({
          details: [{ field: 'email', message: 'Email already exists' }],
        });
      }
    }

    // Update profile
    await this.profileRepository.updateProfile(request.userId, {
      name: request.name,
      username: request.username,
      email: request.email,
    });

    return {
      success: true,
    };
  }
}

