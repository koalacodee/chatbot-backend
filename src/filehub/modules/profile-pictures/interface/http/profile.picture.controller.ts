import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { GenerateProfilePictureUploadUrlUseCase } from '../../application/use-case/generate-profile-picture-upload-url.use-case';
import { GetMyProfilePictureUrlUseCase } from '../../application/use-case/get-my-profile-picture-url.use-case';
import { GenerateProfilePictureUploadUrlDto } from './dto/generate-profile-picture-upload-url.dto';

@Controller('filehub/profile-pictures')
export class ProfilePictureController {
  constructor(
    private readonly generateProfilePictureUploadUrlUseCase: GenerateProfilePictureUploadUrlUseCase,
    private readonly getMyProfilePictureUrlUseCase: GetMyProfilePictureUrlUseCase,
  ) {}

  @Post('upload-url')
  @UseGuards(UserJwtAuthGuard)
  async generateUploadUrl(
    @Req() req: any,
    @Body() dto: GenerateProfilePictureUploadUrlDto,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.generateProfilePictureUploadUrlUseCase.execute({
        userId,
        fileExtension: dto.fileExtension,
      });

      return {
        signedUrl: result.signedUrl,
        expirationDate: result.expirationDate,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate upload URL',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('my-picture')
  @UseGuards(UserJwtAuthGuard)
  async getMyProfilePicture(@Req() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.getMyProfilePictureUrlUseCase.execute({
        userId,
      });

      return {
        signedUrl: result.signedUrl,
        expirationDate: result.expirationDate,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(
          'Profile picture not found',
          HttpStatus.NOT_FOUND,
        );
      }
      console.error(error);

      throw new HttpException(
        'Failed to get profile picture',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
