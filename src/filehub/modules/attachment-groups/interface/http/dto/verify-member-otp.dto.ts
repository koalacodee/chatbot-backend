import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyMemberOtpDto {
  @IsString()
  @IsNotEmpty()
  authorizeOtp: string;
}
