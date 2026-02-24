import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ReauthMemberDto {
  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsUUID()
  @IsNotEmpty()
  memberId: string;
}
