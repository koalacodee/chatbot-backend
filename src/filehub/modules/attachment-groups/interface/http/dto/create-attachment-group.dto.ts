import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttachmentGroupDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  attachmentIds: string[];

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}
