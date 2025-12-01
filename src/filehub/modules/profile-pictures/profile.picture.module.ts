import { Global, Module } from '@nestjs/common';
import { DrizzleProfilePictureRepository } from './infrastructure/repositories/drizzle-profile-picture.repository';
import { ProfilePictureRepository } from './domain/repositories/profile-picture.repository';
import { ProfilePictureUploadedListener } from './application/listeners/profile-picture-uploaded.listener';
import { GenerateProfilePictureUploadUrlUseCase } from './application/use-case/generate-profile-picture-upload-url.use-case';
import { GetMyProfilePictureUrlUseCase } from './application/use-case/get-my-profile-picture-url.use-case';
import { ProfilePictureController } from './interface/http/profile.picture.controller';

@Global()
@Module({
  providers: [
    {
      provide: ProfilePictureRepository,
      useClass: DrizzleProfilePictureRepository,
    },
    ProfilePictureUploadedListener,
    GenerateProfilePictureUploadUrlUseCase,
    GetMyProfilePictureUrlUseCase,
  ],
  exports: [ProfilePictureRepository],
  controllers: [ProfilePictureController],
})
export class ProfilePictureModule {}
