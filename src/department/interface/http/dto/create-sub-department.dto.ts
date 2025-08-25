import { IsString, IsUUID } from 'class-validator';

export class CreateSubDepartmentDto {
  @IsUUID()
  parentId: string;

  @IsString()
  name: string;
}
