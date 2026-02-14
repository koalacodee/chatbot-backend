import { Expose } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// ──────────────────────────────────────────────
// Request
// ──────────────────────────────────────────────

export class GetDelegablesRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

// ──────────────────────────────────────────────
// Response
// ──────────────────────────────────────────────

export class DelegableResponseDto {
  @Expose()
  type: string;

  @Expose()
  name: string;

  @Expose()
  itemId: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  jobTitle: string;
}
