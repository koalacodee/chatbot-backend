import { IsOptional, IsString } from 'class-validator';

export class RejectTaskInputDto {
  @IsOptional()
  @IsString()
  feedback?: string;
}
