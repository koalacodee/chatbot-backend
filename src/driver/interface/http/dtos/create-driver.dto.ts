import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  userId: string;

  @IsString()
  supervisorId: string;

  @IsString()
  licensingNumber: string;

  @IsDate()
  @Type(() => Date)
  drivingLicenseExpiry: Date;
}
