import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  GetAllLicensesUseCase,
  GetSingleLicenseUseCase,
  SortLicensesByExpiryDateUseCase,
  UpdateLicenseUseCase,
} from '../../application/use-cases';
import { VehicleLicense } from '../../domain/entities/vehicle-license.entity';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

interface UpdateLicenseDto {
  licenseId: string;
  licenseNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

interface GetAllLicensesQuery {
  page?: string;
  limit?: string;
  vehicleId?: string;
  driverId?: string;
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

interface SortByExpiryQuery {
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

@Controller('vehicle-licenses')
export class VehicleLicenseController {
  constructor(
    private readonly getAllLicensesUseCase: GetAllLicensesUseCase,
    private readonly getSingleLicenseUseCase: GetSingleLicenseUseCase,
    private readonly sortLicensesByExpiryDateUseCase: SortLicensesByExpiryDateUseCase,
    private readonly updateLicenseUseCase: UpdateLicenseUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get()
  async getAll(@Query() query: GetAllLicensesQuery): Promise<any[]> {
    return this.getAllLicensesUseCase.execute({
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      vehicleId: query.vehicleId,
      driverId: query.driverId,
      status: query.status,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get(':id')
  async get(@Param('id') licenseId: string): Promise<VehicleLicense> {
    return this.getSingleLicenseUseCase.execute({ licenseId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('sorted/by-expiry')
  async getSortedByExpiry(@Query() query: SortByExpiryQuery): Promise<any[]> {
    return this.sortLicensesByExpiryDateUseCase.execute({
      status: query.status,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put()
  async update(@Body() dto: UpdateLicenseDto): Promise<any> {
    return this.updateLicenseUseCase.execute(dto);
  }
}
