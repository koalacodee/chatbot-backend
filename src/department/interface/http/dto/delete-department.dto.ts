import { IsString } from 'class-validator';

export class DeleteDepartmentInputDto {
  @IsString()
  id: string;
}