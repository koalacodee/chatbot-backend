import { IsString } from 'class-validator';

export class CreateDepartmentInputDto {
  @IsString()
  name: string;
}