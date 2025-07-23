import { IsString } from 'class-validator';

export class FindKnowledgeChunksByDepartmentInputDto {
  @IsString()
  departmentId: string;
}