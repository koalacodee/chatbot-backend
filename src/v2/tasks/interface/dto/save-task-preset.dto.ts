import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { TaskPresetResponseDto } from './get-task-presets.dto';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class SaveTaskPresetRequestDto {
  @IsUUID()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  presetName: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class SaveTaskPresetResponseDto {
  @Expose()
  @ValidateNested()
  @Type(() => TaskPresetResponseDto)
  preset: TaskPresetResponseDto;
}
