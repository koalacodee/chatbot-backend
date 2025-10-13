import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateKnowledgeChunkInputDto {
  @IsString()
  content: string;

  @IsString()
  departmentId: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}
