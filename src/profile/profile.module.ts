import { Global, Module } from '@nestjs/common';
import { ProfilePictureRepository } from './domain/repositories/profile-picture.repository';
import { PrismaProfilePictureRepository } from './infrastructure/repositories/prisma-profile-picture.repository';
import { ProfileRepository } from './domain/repositories/profile.repository';
import { PrismaProfileRepository } from './infrastructure/repositories/prisma-profile.repository';
import { DrizzleProfileRepository } from './infrastructure/repositories/drizzle-profile.repository';
import { ProfilePictureController } from './interface/http/profile-picture.controller';
import { ProfileController } from './interface/http/profile.controller';
import { UploadProfilePictureUseCase } from './application/use-cases/upload-profile-picture.use-case';
import { GetProfilePictureByTokenUseCase } from './application/use-cases/get-profile-picture-by-token.use-case';
import { GenerateProfilePictureUploadKeyUseCase } from './application/use-cases/generate-profile-picture-upload-key.use-case';
import { GetUserProfilePictureUseCase } from './application/use-cases/get-user-profile-picture.use-case';
import { GetUsersProfilePicturesUseCase } from './application/use-cases/get-users-profile-pictures.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { SendProfilePasswordResetOTPUseCase } from './application/use-cases/send-profile-password-reset-otp.use-case';
import { VerifyProfilePasswordResetOTPUseCase } from './application/use-cases/verify-profile-password-reset-otp.use-case';

@Global()
@Module({
  controllers: [ProfilePictureController, ProfileController],
  providers: [
    {
      provide: ProfilePictureRepository,
      useClass: PrismaProfilePictureRepository,
    },
    {
      provide: ProfileRepository,
      useClass: DrizzleProfileRepository,
    },
    PrismaProfileRepository,
    UploadProfilePictureUseCase,
    GetProfilePictureByTokenUseCase,
    GenerateProfilePictureUploadKeyUseCase,
    GetUserProfilePictureUseCase,
    GetUsersProfilePicturesUseCase,
    UpdateProfileUseCase,
    SendProfilePasswordResetOTPUseCase,
    VerifyProfilePasswordResetOTPUseCase,
  ],
  exports: [
    ProfilePictureRepository,
    ProfileRepository,
    PrismaProfileRepository,
    UploadProfilePictureUseCase,
    GetProfilePictureByTokenUseCase,
    GenerateProfilePictureUploadKeyUseCase,
    GetUserProfilePictureUseCase,
    GetUsersProfilePicturesUseCase,
    UpdateProfileUseCase,
    SendProfilePasswordResetOTPUseCase,
    VerifyProfilePasswordResetOTPUseCase,
  ],
})
export class ProfileModule { }
