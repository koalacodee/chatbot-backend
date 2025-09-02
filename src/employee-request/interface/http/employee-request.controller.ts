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
import { SupervisorPermissions } from 'src/rbac/decorators';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';

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
  @SupervisorPermissions()
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
  @SupervisorPermissions()
  async findAll(@Query() query: GetEmployeeRequestsDto, @Req() req: any) {
    return await this.getEmployeeRequestsUseCase.execute(query, req.user.id);
  }

  @Get(':id')
  @SupervisorPermissions()
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.getEmployeeRequestByIdUseCase.execute(id, req.user.id);
  }

  @Patch(':id/approve')
  @SupervisorPermissions(SupervisorPermissionsEnum.APPROVE_STAFF_REQUESTS)
  async approve(@Param('id') id: string, @Req() req: any) {
    return await this.approveEmployeeRequestUseCase.execute({
      employeeRequestId: id,
      approvedAdminUserID: req.user.id,
    });
  }

  @Patch(':id/reject')
  @SupervisorPermissions(SupervisorPermissionsEnum.APPROVE_STAFF_REQUESTS)
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
