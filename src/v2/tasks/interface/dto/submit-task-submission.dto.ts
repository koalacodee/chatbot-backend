import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TaskSubmissionResponseDto } from './get-all-tasks.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class SubmitTaskSubmissionRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  attach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chooseAttachments?: string[];
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class SubmitTaskSubmissionResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskSubmissionResponseDto)
  taskSubmission: TaskSubmissionResponseDto;

  @Expose()
  fileHubUploadKey?: string;
}
