import {
  IsOptional,
  IsString,
  IsNumberString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RequestStatus } from 'src/employee-request/domain/entities/employee-request.entity';

export class GetEmployeeRequestsDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Handle both comma-separated string and array formats
    if (typeof value === 'string') {
      return value.split(',');
    }
    // Handle statuses[] format from Axios
    if (Array.isArray(value)) {
      return value;
    }
    return value;
  })
  @IsEnum(RequestStatus, { each: true })
  @IsArray()
  statuses?: RequestStatus[];

  // Handle Axios array format with square brackets
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  })
  @IsEnum(RequestStatus, { each: true })
  @IsArray()
  'statuses[]'?: RequestStatus[];

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
