import { IsString } from 'class-validator';

export class DeleteKnowledgeChunkInputDto {
  @IsString()
  id: string;
}