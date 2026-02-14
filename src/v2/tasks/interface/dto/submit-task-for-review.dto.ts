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

export class SubmitTaskForReviewRequestDto {
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

export class SubmitTaskForReviewResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskSubmissionResponseDto)
  submission: TaskSubmissionResponseDto;

  @Expose()
  fileHubUploadKey?: string;
}
