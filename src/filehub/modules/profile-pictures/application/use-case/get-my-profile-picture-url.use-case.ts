import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

export interface GetMyProfilePictureUrlInput {
  userId: string;
}

export interface GetMyProfilePictureUrlOutput {
  signedUrl: string;
  expirationDate: Date;
}

@Injectable()
export class GetMyProfilePictureUrlUseCase {
  constructor(
    private readonly profilePictureRepository: ProfilePictureRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    input: GetMyProfilePictureUrlInput,
  ): Promise<GetMyProfilePictureUrlOutput> {
    // Find the profile picture by userId
    const profilePicture = await this.profilePictureRepository.findByUserId(
      input.userId,
    );

    if (!profilePicture) {
      throw new NotFoundException('Profile picture not found');
    }

    // Sign the URL with 7 days expiry (7 * 24 * 60 * 60 * 1000 ms)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const signedUrlData = await this.fileHubService.getSignedUrl(
      profilePicture.filename,
      sevenDaysInMs,
    );

    return {
      signedUrl: signedUrlData.signedUrl,
      expirationDate: signedUrlData.expirationDate,
    };
  }
}
