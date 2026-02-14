import { Expose, Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { TaskResponseDto } from './create-task.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class RejectTaskRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class RejectTaskResponseDto extends TaskResponseDto {}
