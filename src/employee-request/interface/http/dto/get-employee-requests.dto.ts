import {
  IsOptional,
  IsString,
  IsNumberString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { RequestStatus } from 'src/employee-request/domain/entities/employee-request.entity';

export class GetEmployeeRequestsDto {
  @IsOptional()
  @IsEnum(RequestStatus, { each: true })
  @IsArray()
  statuses?: RequestStatus[];

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsNumberString()
  offset?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;
}
