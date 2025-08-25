import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { AudienceType } from "src/promotion/domain/entities/promotion.entity";

export class CreatePromotionDto {
  @IsString()
  title: string;
  
  @IsBoolean()
  @IsOptional()
  attach?: boolean;
  
  @IsEnum(AudienceType)
  audience?: AudienceType;
  
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endDate?: string;
}