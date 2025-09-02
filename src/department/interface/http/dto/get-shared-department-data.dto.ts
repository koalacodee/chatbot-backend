import { IsString } from 'class-validator';

export class GetSharedDepartmentDataDto {
  @IsString()
  key: string;
}
