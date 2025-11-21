import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VerifyProfilePasswordResetOTPDto {
  @IsNotEmpty({ message: 'code_required' })
  @IsString({ message: 'code_must_be_string' })
  code: string;

  @IsNotEmpty({ message: 'password_required' })
  @IsString({ message: 'password_must_be_string' })
  newPassword: string;
}

