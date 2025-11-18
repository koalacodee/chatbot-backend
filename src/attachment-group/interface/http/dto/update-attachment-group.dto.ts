import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class UpdateAttachmentGroupDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  attachmentIds: string[];

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}
