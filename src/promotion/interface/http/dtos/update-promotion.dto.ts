import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AudienceType } from 'src/promotion/domain/entities/promotion.entity';

export class UpdatePromotionDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsEnum(AudienceType)
  audience?: AudienceType;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteAttachments?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}
