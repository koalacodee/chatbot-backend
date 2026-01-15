import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAttachmentGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  attachmentIds: string[];

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}
