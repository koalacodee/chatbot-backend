import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  attachmentGroupId: string;
}
