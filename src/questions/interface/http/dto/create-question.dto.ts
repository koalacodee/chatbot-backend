import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateQuestionInputDto {
  @IsString()
  text: string;

  @IsString()
  departmentId: string;

  @IsOptional()
  @IsString()
  knowledgeChunkId?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}
