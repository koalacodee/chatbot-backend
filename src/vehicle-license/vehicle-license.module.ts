import { Module } from '@nestjs/common';
import { VehicleLicenseRepository } from './domain/repositories/vehicle-license.repository';
import { DrizzleVehicleLicenseRepository } from './infrastructure/repositories/drizzle-vehicle-license.repository';
import { VehicleLicenseController } from './interface/http/vehicle-license.controller';
import {
  GetAllLicensesUseCase,
  GetSingleLicenseUseCase,
  UpdateLicenseUseCase,
  SortLicensesByExpiryDateUseCase,
} from './application/use-cases';

@Module({
  controllers: [VehicleLicenseController],
  providers: [
    {
      provide: VehicleLicenseRepository,
      useClass: DrizzleVehicleLicenseRepository,
    },
    GetAllLicensesUseCase,
    GetSingleLicenseUseCase,
    UpdateLicenseUseCase,
    SortLicensesByExpiryDateUseCase,
  ],
  exports: [VehicleLicenseRepository],
})
export class VehicleLicenseModule {}
