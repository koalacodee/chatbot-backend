import { Type } from "class-transformer";
import { IsDate, IsOptional, IsArray, IsString, IsNumber } from "class-validator";

export class ExportTasksDto {
  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end?: Date;
}

