import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateViolationUseCase,
  DeleteViolationUseCase,
  GetViolationsUseCase,
  MarkViolationAsPaidUseCase,
  MarkViolationAsPendingUseCase,
} from '../../application/use-cases';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

interface CreateViolationDto {
  driverId: string;
  vehicleId: string;
  ruleId: string;
  description: string;
  amount: number;
  triggerEventId: string;
  date?: string;
}

interface GetViolationsQuery {
  page?: string;
  limit?: string;
  driverId?: string;
  vehicleId?: string;
  status?: 'paid' | 'pending';
}

@Controller('violations')
export class ViolationController {
  constructor(
    private readonly createViolationUseCase: CreateViolationUseCase,
    private readonly deleteViolationUseCase: DeleteViolationUseCase,
    private readonly getViolationsUseCase: GetViolationsUseCase,
    private readonly markViolationAsPaidUseCase: MarkViolationAsPaidUseCase,
    private readonly markViolationAsPendingUseCase: MarkViolationAsPendingUseCase,
  ) {}

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post()
  async create(@Body() dto: CreateViolationDto): Promise<any> {
    return this.createViolationUseCase.execute(dto);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Get()
  async getAll(@Query() query: GetViolationsQuery): Promise<any> {
    return this.getViolationsUseCase.execute({
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      driverId: query.driverId,
      vehicleId: query.vehicleId,
      status: query.status,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(
    @Param('id') violationId: string,
  ): Promise<{ success: boolean }> {
    return this.deleteViolationUseCase.execute({ violationId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post(':id/mark-paid')
  async markAsPaid(@Param('id') violationId: string): Promise<any> {
    return this.markViolationAsPaidUseCase.execute({ violationId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post(':id/mark-pending')
  async markAsPending(@Param('id') violationId: string): Promise<any> {
    return this.markViolationAsPendingUseCase.execute({ violationId });
  }
}
