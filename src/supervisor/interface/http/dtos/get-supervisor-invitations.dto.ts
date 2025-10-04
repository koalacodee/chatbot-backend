import { IsOptional, IsEnum, IsNumberString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetSupervisorInvitationsDto {
  @IsOptional()
  @IsEnum(['pending', 'completed', 'expired'])
  status?: 'pending' | 'completed' | 'expired';

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  @Max(100)
  limit?: number;
}
