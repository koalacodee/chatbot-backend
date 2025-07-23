import { IsString, IsOptional } from 'class-validator';

export class UpdateQuestionInputDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  knowledgeChunkId?: string;
}