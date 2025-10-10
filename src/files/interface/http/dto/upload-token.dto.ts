import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UploadTokenDto {
  @IsString()
  @IsUUID()
  targetId: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  guestId?: string;
}
