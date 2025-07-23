import { IsArray, IsString } from 'class-validator';

export class DeleteManyDepartmentsInputDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}