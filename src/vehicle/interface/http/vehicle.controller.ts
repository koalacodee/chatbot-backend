import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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
} from '../../application/use-cases';
import { CreateVehicleInputDto, UpdateVehicleInputDto } from './dto';
import { Vehicle, VehicleStatus } from '../../domain/entities/vehicle.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { Roles } from 'src/shared/value-objects/role.vo';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';

@Controller('vehicles')
export class VehicleController {
  constructor(
    private readonly createUseCase: CreateVehicleUseCase,
    private readonly updateUseCase: UpdateVehicleUseCase,
    private readonly getUseCase: GetVehicleUseCase,
    private readonly getAllUseCase: GetAllVehiclesUseCase,
    private readonly deleteUseCase: DeleteVehicleUseCase,
    private readonly countUseCase: CountVehiclesUseCase,
    private readonly assignDriverUseCase: AssignDriverToVehicleUseCase,
    private readonly updateStatusUseCase: UpdateVehicleStatusUseCase,
    private readonly searchUseCase: SearchVehiclesUseCase,
  ) {}

  @AdminAuth()
  @Post(':id/assign-driver')
  async assignDriver(
    @Param('id') id: string,
    @Body() body: { assignedDriverId: string },
  ): Promise<Vehicle> {
    return this.assignDriverUseCase.execute({
      vehicleId: id,
      assignedDriverId: body.assignedDriverId,
    });
  }

  @AdminAuth()
  @Post(':id/update-status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<Vehicle> {
    return this.updateStatusUseCase.execute({
      vehicleId: id,
      status: body.status,
    });
  }

  @AdminAuth()
  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const results = await this.searchUseCase.execute({
      q,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return results.map((v) => v.toJSON());
  }

  @AdminAuth()
  @Post()
  async create(@Body() input: CreateVehicleInputDto): Promise<Vehicle> {
    return this.createUseCase.execute({
      ...input,
      status: VehicleStatus.ACTIVE,
    });
  }

  @AdminAuth()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() input: UpdateVehicleInputDto,
  ): Promise<Vehicle> {
    const { nextMaintenanceDate, ...rest } = input;
    return this.updateUseCase.execute(id, {
      ...rest,
      nextMaintenanceDate: nextMaintenanceDate
        ? new Date(nextMaintenanceDate)
        : undefined,
    } as any);
  }

  @AdminAuth()
  @Get(':id')
  async get(@Param('id') id: string): Promise<Vehicle> {
    return this.getUseCase.execute(id);
  }

  @AdminAuth()
  @Get()
  async getAll(
    @Query('status') status?: string,
    @Query('assignedDriverId') assignedDriverId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const list = await this.getAllUseCase.execute({
      status,
      assignedDriverId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return list.map((v) => v.toJSON());
  }

  @AdminAuth()
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Vehicle | null> {
    return this.deleteUseCase.execute(id);
  }

  @AdminAuth()
  @Get('count/all')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}
