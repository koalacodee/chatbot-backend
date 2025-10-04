import { Injectable } from '@nestjs/common';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { ProfilePicture } from '../../domain/entities/profile-picture.entity';

export interface GetUsersProfilePicturesRequest {
  userIds: string[];
}

export interface GetUsersProfilePicturesResponse {
  profilePictures: Map<string, ProfilePicture>;
}

@Injectable()
export class GetUsersProfilePicturesUseCase {
  constructor(
    private readonly profilePictureRepository: ProfilePictureRepository,
  ) {}

  async execute(
    request: GetUsersProfilePicturesRequest,
  ): Promise<GetUsersProfilePicturesResponse> {
    const profilePictures = await this.profilePictureRepository.findByUserIds(
      request.userIds,
    );

    // Create a map of userId -> ProfilePicture for easy lookup
    const profilePicturesMap = new Map<string, ProfilePicture>();
    profilePictures.forEach((profilePicture) => {
      profilePicturesMap.set(profilePicture.userId, profilePicture);
    });

    return {
      profilePictures: profilePicturesMap,
    };
  }
}
