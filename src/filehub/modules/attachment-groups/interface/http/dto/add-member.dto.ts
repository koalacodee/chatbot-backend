import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
