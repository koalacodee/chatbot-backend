import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ShareManyAttachmentsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  attachmentIds: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate?: Date;
}
