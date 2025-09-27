import { IsString, IsOptional } from 'class-validator';

export class SubmitTaskSubmissionInputDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  attach?: boolean;
}
