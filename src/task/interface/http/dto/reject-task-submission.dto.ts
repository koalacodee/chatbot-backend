import { IsString, IsOptional } from 'class-validator';

export class RejectTaskSubmissionInputDto {
  @IsString()
  taskSubmissionId: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
