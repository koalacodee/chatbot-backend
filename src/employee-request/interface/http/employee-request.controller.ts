import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
  Delete,
  Req,
} from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { SubmitEmployeeRequestUseCase } from '../../application/use-cases/submit-employee-request.use-case';
import { ApproveEmployeeRequestUseCase } from '../../application/use-cases/approve-employee-request.use-case';
import { RejectEmployeeRequestUseCase } from '../../application/use-cases/reject-employee-request.use-case';
import { GetEmployeeRequestsUseCase } from '../../application/use-cases/get-employee-requests.use-case';
import { GetEmployeeRequestByIdUseCase } from '../../application/use-cases/get-employee-request-by-id.use-case';
import { User } from 'src/shared/entities/user.entity';
import { CreateEmployeeRequestDto } from './dto/create-employee-request.dto';
import { RejectEmployeeRequestDto } from './dto/reject-employee-request.dto';
import { GetEmployeeRequestsDto } from './dto/get-employee-requests.dto';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

@Controller('employee-requests')
@UseGuards(UserJwtAuthGuard)
export class EmployeeRequestController {
  constructor(
    private readonly submitEmployeeRequestUseCase: SubmitEmployeeRequestUseCase,
    private readonly approveEmployeeRequestUseCase: ApproveEmployeeRequestUseCase,
    private readonly rejectEmployeeRequestUseCase: RejectEmployeeRequestUseCase,
    private readonly getEmployeeRequestsUseCase: GetEmployeeRequestsUseCase,
    private readonly getEmployeeRequestByIdUseCase: GetEmployeeRequestByIdUseCase,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @UseRoles(Roles.SUPERVISOR)
  async create(
    @Body() createEmployeeRequestDto: CreateEmployeeRequestDto,
    @Req() req: any,
  ) {
    return await this.submitEmployeeRequestUseCase.execute(
      createEmployeeRequestDto,
      req.user.id,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  async findAll(@Query() query: GetEmployeeRequestsDto) {
    return await this.getEmployeeRequestsUseCase.execute(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  async findOne(@Param('id') id: string) {
    return await this.getEmployeeRequestByIdUseCase.execute(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @UseRoles(Roles.ADMIN)
  async approve(@Param('id') id: string, @Req() req: any) {
    return await this.approveEmployeeRequestUseCase.execute({
      employeeRequestId: id,
      approvedAdminUserID: req.user.id,
    });
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @UseRoles(Roles.ADMIN)
  async reject(
    @Param('id') id: string,
    @Body() rejectEmployeeRequestDto: RejectEmployeeRequestDto,
    @Req() req: any,
  ) {
    return await this.rejectEmployeeRequestUseCase.execute({
      employeeRequestId: id,
      ...rejectEmployeeRequestDto,
      adminId: req.user.id,
    });
  }
}
