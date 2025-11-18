import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { GetEmployeeUseCase } from '../../application/use-cases/get-employee.use-case';
import { GetAllEmployeesUseCase } from '../../application/use-cases/get-all-employees.use-case';
import { UpdateEmployeeUseCase } from '../../application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from '../../application/use-cases/delete-employee.use-case';
import { GetEmployeeByUserIdUseCase } from '../../application/use-cases/get-employee-by-user-id.use-case';
import { CreateEmployeeDirectDto } from '../dtos/create-employee-direct.dto';
import { UpdateEmployeeDto } from '../dtos/update-employee.dto';
import { GetEmployeesByPermissionsDto } from '../dtos/get-employees-by-permissions.dto';
import { CreateEmployeeDirectUseCase } from 'src/employee/application/use-cases/create-employee.use-case';
import { GetEmployeesBySubDepartmentUseCase } from 'src/employee/application/use-cases/get-employees-by-sub-department.use-case';
import { CanDeleteEmployeeUseCase } from 'src/employee/application/use-cases/can-delete-employee.use-case';
import { GetEmployeesByPermissionsUseCase } from 'src/employee/application/use-cases/get-employees-by-permissions.use-case';
import { GetEmployeeInvitationUseCase } from 'src/employee/application/use-cases/get-employee-invitation.use-case';
import { CompleteEmployeeInvitationUseCase } from 'src/employee/application/use-cases/complete-employee-invitation.use-case';
import { RequestEmployeeInvitationUseCase } from 'src/employee/application/use-cases/request-employee-invitation.use-case';
import { AcceptEmployeeInvitationRequestUseCase } from 'src/employee/application/use-cases/accept-employee-invitation-request.use-case';
import { GetAllEmployeeInvitationRequestsUseCase } from 'src/employee/application/use-cases/get-all-employee-invitation-requests.use-case';
import { GetMyEmployeeInvitationRequestsUseCase } from 'src/employee/application/use-cases/get-my-employee-invitation-requests.use-case';
import { DeleteEmployeeInvitationUseCase } from 'src/employee/application/use-cases/delete-employee-invitation.use-case';
import { SupervisorPermissions } from 'src/rbac/decorators';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { CompleteEmployeeInvitationDto } from 'src/employee/interface/http/dtos/complete-employee-invitation.dto';

@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly createEmployeeDirectUseCase: CreateEmployeeDirectUseCase,
    private readonly getEmployeeUseCase: GetEmployeeUseCase,
    private readonly getAllEmployeesUseCase: GetAllEmployeesUseCase,
    private readonly getEmployeesBySubDepartmentUseCase: GetEmployeesBySubDepartmentUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
    private readonly deleteEmployeeUseCase: DeleteEmployeeUseCase,
    private readonly getEmployeeByUserIdUseCase: GetEmployeeByUserIdUseCase,
    private readonly canDeleteEmployeeUseCase: CanDeleteEmployeeUseCase,
    private readonly getEmployeesByPermissionsUseCase: GetEmployeesByPermissionsUseCase,
    private readonly getEmployeeInvitationUseCase: GetEmployeeInvitationUseCase,
    private readonly completeEmployeeInvitationUseCase: CompleteEmployeeInvitationUseCase,
    private readonly requestEmployeeInvitationUseCase: RequestEmployeeInvitationUseCase,
    private readonly acceptEmployeeInvitationRequestUseCase: AcceptEmployeeInvitationRequestUseCase,
    private readonly getAllEmployeeInvitationRequestsUseCase: GetAllEmployeeInvitationRequestsUseCase,
    private readonly getMyEmployeeInvitationRequestsUseCase: GetMyEmployeeInvitationRequestsUseCase,
    private readonly deleteEmployeeInvitationUseCase: DeleteEmployeeInvitationUseCase,
  ) { }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_STAFF_DIRECTLY)
  @Post()
  async createDirect(
    @Body() createEmployeeDto: CreateEmployeeDirectDto,
    @Req() req: any,
  ): Promise<any> {
    const result = await this.createEmployeeDirectUseCase.execute(
      {
        email: createEmployeeDto.email,
        fullName: createEmployeeDto.fullName,
        jobTitle: createEmployeeDto.jobTitle,
        employeeId: createEmployeeDto.employeeId,
        permissions: createEmployeeDto.permissions,
        subDepartmentIds: createEmployeeDto.subDepartmentIds,
        supervisorUserId: createEmployeeDto.supervisorUserId,
      },
      req.user.id,
    );

    return result;
  }

  @Get('invitation/:token')
  async getInvitation(@Param('token') token: string): Promise<any> {
    return this.getEmployeeInvitationUseCase.execute({ token });
  }

  @Post('invitation/complete')
  async completeInvitation(
    @Body()
    body: CompleteEmployeeInvitationDto,
  ): Promise<any> {
    return this.completeEmployeeInvitationUseCase.execute(body);
  }

  @SupervisorPermissions()
  @Post('invitation/request')
  async requestInvitation(
    @Body()
    body: {
      email: string;
      fullName: string;
      jobTitle: string;
      employeeId?: string;
      permissions: any[];
      subDepartmentIds: string[];
    },
    @Req() req: any,
  ): Promise<any> {
    return this.requestEmployeeInvitationUseCase.execute(
      body as any,
      req.user.id,
    );
  }

  @AdminAuth()
  @Post('invitation/accept/:token')
  async acceptInvitationRequest(
    @Param('token') token: string,
    @Req() req: any,
  ): Promise<any> {
    return this.acceptEmployeeInvitationRequestUseCase.execute(
      { token },
      req.user.id,
    );
  }

  @AdminAuth()
  @Get('invitation/requests')
  async getAllInvitationRequests(
    @Req() req: any,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.getAllEmployeeInvitationRequestsUseCase.execute(
      { status: status as any },
      req.user.id,
    );
  }

  @SupervisorPermissions()
  @Get('invitation/my-requests')
  async getMyInvitationRequests(
    @Req() req: any,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.getMyEmployeeInvitationRequestsUseCase.execute(
      { status: status as any },
      req.user.id,
    );
  }

  @SupervisorPermissions()
  @Delete('invitation/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvitation(
    @Param('token') token: string,
    @Req() req: any,
  ): Promise<void> {
    await this.deleteEmployeeInvitationUseCase.execute(
      { token },
      req.user.id,
    );
  }

  @SupervisorPermissions()
  @Get()
  async findAll(@Req() req: any): Promise<any> {
    return this.getAllEmployeesUseCase.execute(req.user.id);
  }

  @SupervisorPermissions()
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const { employee } = await this.getEmployeeUseCase.execute(
      { id },
      req.user.id,
    );
    if (!employee) {
      throw new Error('Employee not found');
    }

    return {
      id: employee.id,
      userId: employee.userId,
      permissions: employee.permissions,
      supervisorId: employee.supervisorId,
      subDepartmentIds: employee.subDepartments.map((dept) => dept.id),
    };
  }

  @SupervisorPermissions()
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Req() req: any) {
    const { employee } = await this.getEmployeeByUserIdUseCase.execute(
      {
        userId,
      },
      req.user.id,
    );
    if (!employee) {
      throw new Error('Employee not found');
    }

    return {
      id: employee.id,
      userId: employee.userId,
      permissions: employee.permissions,
      supervisorId: employee.supervisorId,
      subDepartmentIds: employee.subDepartments.map((dept) => dept.id),
    };
  }

  @SupervisorPermissions()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    const { employee } = await this.updateEmployeeUseCase.execute(
      {
        id,
        ...updateEmployeeDto,
      },
      req.user.id,
    );

    return {
      id: employee.id,
      userId: employee.userId,
      permissions: employee.permissions,
      supervisorId: employee.supervisorId,
      subDepartmentIds: employee.subDepartments.map(({ id }) => id),
    };
  }

  @SupervisorPermissions()
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const { employee } = await this.deleteEmployeeUseCase.execute(
      { id },
      req.user.id,
    );
    if (!employee) {
      throw new Error('Employee not found');
    }

    return {
      id: employee.id,
      userId: employee.userId,
      permissions: employee.permissions,
      supervisorId: employee.supervisorId,
      subDepartmentIds: employee.subDepartments.map(({ id }) => id),
    };
  }

  @Get('sub-department/:id')
  @SupervisorPermissions()
  async getBySupDepartment(
    @Param('id') subDepartmentId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.getEmployeesBySubDepartmentUseCase.execute(
      { subDepartmentId },
      req.user.id,
    );
  }

  @Get('can-delete/:id')
  @SupervisorPermissions()
  async canDeleteEmployee(@Param('id') id: string, @Req() req: any) {
    return this.canDeleteEmployeeUseCase.execute(
      { employeeId: id },
      req.user.id,
    );
  }

  @Post('by-permissions')
  @SupervisorPermissions()
  async getByPermissions(
    @Body() body: GetEmployeesByPermissionsDto,
    @Req() req: any,
  ): Promise<any> {
    return this.getEmployeesByPermissionsUseCase.execute(
      {
        permissions: body.permissions,
      },
      req.user.id,
    );
  }
}
