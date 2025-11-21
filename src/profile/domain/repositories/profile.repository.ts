export interface UpdateProfileData {
  name?: string;
  username?: string;
  password?: string;
  email?: string;
}

export abstract class ProfileRepository {
  abstract updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<void>;
}

