import { ProfilePicture } from '../entities/profile.picture.entity';

export abstract class ProfilePictureRepository {
  abstract save(profilePicture: ProfilePicture): Promise<ProfilePicture>;
  abstract findById(id: string): Promise<ProfilePicture | null>;
  abstract findByUserId(userId: string): Promise<ProfilePicture | null>;
  abstract removeById(id: string): Promise<ProfilePicture | null>;
  abstract removeByUserId(userId: string): Promise<ProfilePicture | null>;
  abstract update(
    id: string,
    update: Partial<Pick<ProfilePicture, 'filename'>>,
  ): Promise<ProfilePicture>;
}
