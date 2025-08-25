import { IsString, IsOptional } from 'class-validator';

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
}