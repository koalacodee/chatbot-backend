import { Module } from '@nestjs/common';
import { VehicleRepository } from './domain/repositories/vehicle.repository';
import { PrismaVehicleRepository } from './infrastructure/repositories/prisma-vehicle.repository';
import { VehicleController } from './interface/http/vehicle.controller';
import {
  CreateVehicleUseCase,
  UpdateVehicleUseCase,
  GetVehicleUseCase,
  GetAllVehiclesUseCase,
  DeleteVehicleUseCase,
  CountVehiclesUseCase,
  AssignDriverToVehicleUseCase,
  UpdateVehicleStatusUseCase,
  SearchVehiclesUseCase,
} from './application/use-cases';
import { VehicleLicenseModule } from 'src/vehicle-license/vehicle-license.module';

@Module({
  controllers: [VehicleController],
  providers: [
    { provide: VehicleRepository, useClass: PrismaVehicleRepository },
    CreateVehicleUseCase,
    UpdateVehicleUseCase,
    GetVehicleUseCase,
    GetAllVehiclesUseCase,
    DeleteVehicleUseCase,
    CountVehiclesUseCase,
    AssignDriverToVehicleUseCase,
    UpdateVehicleStatusUseCase,
    SearchVehiclesUseCase,
  ],
  exports: [VehicleRepository],
  imports: [VehicleLicenseModule],
})
export class VehicleModule {}
