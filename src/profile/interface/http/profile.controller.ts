import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { SendProfilePasswordResetOTPUseCase } from '../../application/use-cases/send-profile-password-reset-otp.use-case';
import { VerifyProfilePasswordResetOTPUseCase } from '../../application/use-cases/verify-profile-password-reset-otp.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyProfilePasswordResetOTPDto } from './dto/verify-profile-password-reset-otp.dto';

@Controller('profile')
@UseGuards(UserJwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly sendProfilePasswordResetOTPUseCase: SendProfilePasswordResetOTPUseCase,
    private readonly verifyProfilePasswordResetOTPUseCase: VerifyProfilePasswordResetOTPUseCase,
  ) { }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return await this.updateProfileUseCase.execute({
      userId,
      name: dto.name,
      username: dto.username,
      email: dto.email,
    });
  }

  @Post('password/reset/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendPasswordResetOTP(@Req() req: any) {
    const userId = req.user.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return await this.sendProfilePasswordResetOTPUseCase.execute({
      userId,
    });
  }

  @Post('password/reset/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordResetOTP(
    @Req() req: any,
    @Body() dto: VerifyProfilePasswordResetOTPDto,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return await this.verifyProfilePasswordResetOTPUseCase.execute({
      userId,
      code: dto.code,
      newPassword: dto.newPassword,
    });
  }
}

