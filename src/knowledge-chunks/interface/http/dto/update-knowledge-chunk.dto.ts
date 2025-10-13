import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
} from 'class-validator';

export class UpdateKnowledgeChunkInputDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteAttachments?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}
