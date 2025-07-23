import { IsArray, IsString } from 'class-validator';

export class DeleteManyKnowledgeChunksInputDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}