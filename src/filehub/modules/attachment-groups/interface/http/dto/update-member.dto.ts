import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  attachmentGroupId?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
