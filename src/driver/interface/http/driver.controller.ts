import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateDriverDto } from './dtos/create-driver.dto';
import { UpdateDriverDto } from './dtos/update-driver.dto';
import { CreateDriverUseCase } from '../../application/use-cases/create-driver.use-case';
import { GetDriverUseCase } from '../../application/use-cases/get-driver.use-case';
import { GetAllDriversUseCase } from '../../application/use-cases/get-all-drivers.use-case';
import { UpdateDriverUseCase } from '../../application/use-cases/update-driver.use-case';
import { DeleteDriverUseCase } from '../../application/use-cases/delete-driver.use-case';
import { GetDriverByUserIdUseCase } from '../../application/use-cases/get-driver-by-user-id.use-case';
import { AddDriverBySupervisorUseCase } from '../../application/use-cases/add-driver-by-supervisor.use-case';
import { AddDriverBySupervisorDto } from './dto/add-driver-by-supervisor.dto';
import { RolesGuard } from 'src/rbac/guards/roles.guard';
import { UseRoles } from 'src/rbac/decorators/roles.decorator';
import { Roles as RoleEnum } from 'src/shared/value-objects/role.vo';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';

@Controller('drivers')
export class DriverController {
  constructor(
    private readonly createDriverUseCase: CreateDriverUseCase,
    private readonly getDriverUseCase: GetDriverUseCase,
    private readonly getAllDriversUseCase: GetAllDriversUseCase,
    private readonly updateDriverUseCase: UpdateDriverUseCase,
    private readonly deleteDriverUseCase: DeleteDriverUseCase,
    private readonly getDriverByUserIdUseCase: GetDriverByUserIdUseCase,
    private readonly addDriverBySupervisorUseCase: AddDriverBySupervisorUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDriver(@Body() createDriverDto: CreateDriverDto): Promise<any> {
    const driver = await this.createDriverUseCase.execute(createDriverDto);
    return driver.toJSON();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllDrivers(): Promise<any> {
    const drivers = await this.getAllDriversUseCase.execute();
    return drivers.map((driver) => driver.toJSON());
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getDriver(@Param('id') id: string): Promise<any> {
    const driver = await this.getDriverUseCase.execute(id);
    if (!driver) {
      return { message: 'Driver not found' };
    }
    return driver.toJSON();
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getDriverByUserId(@Param('userId') userId: string): Promise<any> {
    const driver = await this.getDriverByUserIdUseCase.execute(userId);
    if (!driver) {
      return { message: 'Driver not found for this user' };
    }
    return driver.toJSON();
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateDriver(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ): Promise<any> {
    const driver = await this.updateDriverUseCase.execute({
      id,
      ...updateDriverDto,
    });
    if (!driver) {
      return { message: 'Driver not found' };
    }
    return driver.toJSON();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteDriver(@Param('id') id: string) {
    const deleted = await this.deleteDriverUseCase.execute(id);
    if (!deleted) {
      return { message: 'Driver not found' };
    }
    return { message: 'Driver deleted successfully' };
  }

  @Post('supervisor/add')
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(RoleEnum.SUPERVISOR)
  @HttpCode(HttpStatus.CREATED)
  async addDriverBySupervisor(
    @Body() addDriverDto: AddDriverBySupervisorDto,
    @Req() req: any,
  ): Promise<any> {
    const supervisorId = req.user.id;
    const result = await this.addDriverBySupervisorUseCase.execute({
      ...addDriverDto,
      supervisorId,
    });

    return {
      message: 'Driver added successfully',
      driver: result.driver.toJSON(),
      user: result.user.withoutPassword(),
    };
  }
}
