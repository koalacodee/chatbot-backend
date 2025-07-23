import { IsString, IsOptional } from 'class-validator';

export class UpdateDepartmentInputDto {
  @IsString()
  id: string;
  
  @IsOptional()
  @IsString()
  name?: string;
}