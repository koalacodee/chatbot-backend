import { Module } from '@nestjs/common';
import { VehicleRepository } from './domain/repositories/vehicle.repository';
import { VehicleLicenseRepository } from './domain/repositories/vehicle-license.repository';
import { PrismaVehicleRepository } from './infrastructure/repositories/prisma-vehicle.repository';
import { PrismaVehicleLicenseRepository } from './infrastructure/repositories/prisma-vehicle-license.repository';

@Module({
  providers: [
    { provide: VehicleRepository, useClass: PrismaVehicleRepository },
    {
      provide: VehicleLicenseRepository,
      useClass: PrismaVehicleLicenseRepository,
    },
  ],
  exports: [VehicleRepository, VehicleLicenseRepository],
})
export class VehicleModule {}
