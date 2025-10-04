import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { ProfilePicture } from '../../domain/entities/profile-picture.entity';

export interface GetUserProfilePictureRequest {
  userId: string;
}

export interface GetUserProfilePictureResponse {
  profilePicture: ProfilePicture | null;
}

@Injectable()
export class GetUserProfilePictureUseCase {
  constructor(
    private readonly profilePictureRepository: ProfilePictureRepository,
  ) {}

  async execute(
    request: GetUserProfilePictureRequest,
  ): Promise<GetUserProfilePictureResponse> {
    const profilePicture = await this.profilePictureRepository.findByUserId(
      request.userId,
    );

    return {
      profilePicture,
    };
  }
}
