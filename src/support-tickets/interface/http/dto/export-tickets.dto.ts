import { Type } from "class-transformer";
import { IsDate, IsOptional } from "class-validator";

export class ExportTicketsDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end?: Date;
}