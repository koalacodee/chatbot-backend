import { IsOptional, IsUUID } from 'class-validator';
import { PaginateDto } from './paginate.dto';

export class GetAllSubDepartmentsDto extends PaginateDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
