import { Module } from '@nestjs/common';
import { VehicleRepository } from './domain/repositories/vehicle.repository';
import { DrizzleVehicleRepository } from './infrastructure/repositories/drizzle-vehicle.repository';
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
    { provide: VehicleRepository, useClass: DrizzleVehicleRepository },
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
