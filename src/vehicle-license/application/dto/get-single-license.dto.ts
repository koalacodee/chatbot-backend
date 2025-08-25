import { IsString } from 'class-validator';

export class GetSingleLicenseInputDto {
  @IsString()
  licenseId: string;
}
