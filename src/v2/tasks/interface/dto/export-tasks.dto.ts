import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class ExportTasksRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  batchSize?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end?: Date;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class ExportTasksResponseDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  objectPath: string;

  @Expose()
  size: number;

  @Expose()
  rows: number;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;
}
