import { Global, Module } from '@nestjs/common';
import { ProfilePictureRepository } from './domain/repositories/profile-picture.repository';
import { PrismaProfilePictureRepository } from './infrastructure/repositories/prisma-profile-picture.repository';
import { ProfilePictureController } from './interface/http/profile-picture.controller';
import { UploadProfilePictureUseCase } from './application/use-cases/upload-profile-picture.use-case';
import { GetProfilePictureByTokenUseCase } from './application/use-cases/get-profile-picture-by-token.use-case';
import { GenerateProfilePictureUploadKeyUseCase } from './application/use-cases/generate-profile-picture-upload-key.use-case';
import { GetUserProfilePictureUseCase } from './application/use-cases/get-user-profile-picture.use-case';
import { GetUsersProfilePicturesUseCase } from './application/use-cases/get-users-profile-pictures.use-case';

@Global()
@Module({
  controllers: [ProfilePictureController],
  providers: [
    {
      provide: ProfilePictureRepository,
      useClass: PrismaProfilePictureRepository,
    },
    UploadProfilePictureUseCase,
    GetProfilePictureByTokenUseCase,
    GenerateProfilePictureUploadKeyUseCase,
    GetUserProfilePictureUseCase,
    GetUsersProfilePicturesUseCase,
  ],
  exports: [
    ProfilePictureRepository,
    UploadProfilePictureUseCase,
    GetProfilePictureByTokenUseCase,
    GenerateProfilePictureUploadKeyUseCase,
    GetUserProfilePictureUseCase,
    GetUsersProfilePicturesUseCase,
  ],
})
export class ProfileModule {}
