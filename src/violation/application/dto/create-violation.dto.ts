import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateViolationInputDto {
  @IsString()
  driverId: string;

  @IsString()
  ruleId: string;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  triggerEventId: string;
}

export interface CreateViolationOutputDto {
  id: string;
  driverId: string;
  vehicleId: string;
  ruleId: string;
  description: string;
  amount: number;
  isPaid: boolean;
  triggerEventId: string;
  createdAt: string;
  updatedAt: string;
}
