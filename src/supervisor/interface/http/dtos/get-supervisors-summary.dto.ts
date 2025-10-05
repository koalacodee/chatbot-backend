import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class GetSupervisorsSummaryDto {
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  departmentIds?: string[];
}
