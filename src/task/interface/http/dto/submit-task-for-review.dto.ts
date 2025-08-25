import { IsString, IsOptional } from 'class-validator';

export class SubmitTaskForReviewInputDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
