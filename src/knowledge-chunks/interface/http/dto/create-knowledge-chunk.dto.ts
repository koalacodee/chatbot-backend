import { IsString } from 'class-validator';

export class CreateKnowledgeChunkInputDto {
  @IsString()
  content: string;

  @IsString()
  departmentId: string;
}