import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { SupportedLanguageEnum } from 'src/translation/domain/services/translation.service';

export class UpdateQuestionInputDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  knowledgeChunkId?: string;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteAttachments?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(SupportedLanguageEnum, { each: true })
  translateTo?: SupportedLanguageEnum[];
}
