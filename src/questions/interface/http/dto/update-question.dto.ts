import { IsString, IsOptional, IsBoolean } from 'class-validator';

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
}
