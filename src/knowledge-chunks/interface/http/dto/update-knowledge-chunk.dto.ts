import { IsString, IsOptional } from 'class-validator';

export class UpdateKnowledgeChunkInputDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}