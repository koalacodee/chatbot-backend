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
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post()
  async create(@Body() input: CreateVehicleInputDto): Promise<Vehicle> {
    return this.createUseCase.execute({
      ...input,
      status: VehicleStatus.ACTIVE,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get(':id')
  async get(@Param('id') id: string): Promise<Vehicle> {
    return this.getUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Vehicle | null> {
    return this.deleteUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('count/all')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}
