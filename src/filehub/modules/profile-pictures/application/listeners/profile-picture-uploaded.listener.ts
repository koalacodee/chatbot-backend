import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProfilePictureUploadedEvent } from '../../domain/events/profile.picture.uploaded.event';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { ProfilePicture } from '../../domain/entities/profile.picture.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class ProfilePictureUploadedListener {
  constructor(
    private readonly profilePictureRepository: ProfilePictureRepository,
  ) {}

  @OnEvent(ProfilePictureUploadedEvent.name)
  async handleProfilePictureUploadedEvent(
    event: ProfilePictureUploadedEvent,
  ): Promise<void> {
    // Find the profile picture by userId
    const existingProfilePicture =
      await this.profilePictureRepository.findByUserId(event.userId);

    if (existingProfilePicture) {
      // Update the filename if profile picture already exists
      await this.profilePictureRepository.update(
        existingProfilePicture.id.value,
        {
          filename: event.filename,
        },
      );
    } else {
      // Create a new profile picture if it doesn't exist
      const now = new Date();
      const newProfilePicture = ProfilePicture.create({
        id: UUID.create(),
        userId: UUID.create(event.userId),
        filename: event.filename,
        createdAt: now,
        updatedAt: now,
      });

      await this.profilePictureRepository.save(newProfilePicture);
    }
  }
}
