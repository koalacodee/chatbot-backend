import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class SubmitTaskSubmissionInputDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}
