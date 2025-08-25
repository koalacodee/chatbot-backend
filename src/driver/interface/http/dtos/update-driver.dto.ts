import { IsString, IsOptional } from 'class-validator';

export class UpdateDriverDto {
  @IsOptional()
  @IsString({ each: true })
  vehicles?: string[];

  @IsOptional()
  @IsString({ each: true })
  violations?: string[];
}
