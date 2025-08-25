import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateLicenseInputDto {
  @IsString()
  licenseId: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string;

  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}
