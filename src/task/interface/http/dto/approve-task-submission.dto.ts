import { IsString, IsOptional } from 'class-validator';

export class ApproveTaskSubmissionInputDto {
  @IsString()
  taskSubmissionId: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
