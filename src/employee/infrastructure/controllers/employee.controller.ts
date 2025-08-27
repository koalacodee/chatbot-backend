import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateEmployeeUseCase } from '../../application/use-cases/create-employee.use-case';
import { GetEmployeeUseCase } from '../../application/use-cases/get-employee.use-case';
import { GetAllEmployeesUseCase } from '../../application/use-cases/get-all-employees.use-case';
import { UpdateEmployeeUseCase } from '../../application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from '../../application/use-cases/delete-employee.use-case';
import { GetEmployeeByUserIdUseCase } from '../../application/use-cases/get-employee-by-user-id.use-case';
import { CreateEmployeeDto } from '../dtos/create-employee.dto';
import { UpdateEmployeeDto } from '../dtos/update-employee.dto';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetEmployeesBySubDepartmentUseCase } from 'src/employee/application/use-cases/get-employees-by-sub-department.use-case';
import { CanDeleteEmployeeUseCase } from 'src/employee/application/use-cases/can-delete-employee.use-case';

@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly createEmployeeUseCase: CreateEmployeeUseCase,
    private readonly getEmployeeUseCase: GetEmployeeUseCase,
    private readonly getAllEmployeesUseCase: GetAllEmployeesUseCase,
    private readonly getEmployeesBySubDepartmentUseCase: GetEmployeesBySubDepartmentUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
    private readonly deleteEmployeeUseCase: DeleteEmployeeUseCase,
    private readonly getEmployeeByUserIdUseCase: GetEmployeeByUserIdUseCase,
    private readonly canDeleteEmployeeUseCase: CanDeleteEmployeeUseCase,
  ) {}

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    const { employee } = await this.createEmployeeUseCase.execute({
      userId: createEmployeeDto.userId,
      permissions: createEmployeeDto.permissions,
      supervisorId: createEmployeeDto.supervisorId,
      subDepartmentIds: createEmployeeDto.subDepartmentIds,
    });

    return {
      id: employee.id,
      userId: employee.userId,
      permissions: employee.permissions,
      supervisorId: employee.supervisorId,
      subDepartmentIds: employee.subDepartments.map((dept) => dept.id),
    };
  }

  @Get()
  async findAll(): Promise<any> {
    return this.getAllEmployeesUseCase.execute();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const { employee } = await this.getEmployeeUseCase.execute({ id });
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

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    const { employee } = await this.getEmployeeByUserIdUseCase.execute({
      userId,
    });
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

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const { employee } = await this.updateEmployeeUseCase.execute({
      id,
      ...updateEmployeeDto,
    });

    return {
      id: employee.id,
      userId: employee.userId,
      permissions: employee.permissions,
      supervisorId: employee.supervisorId,
      subDepartmentIds: employee.subDepartments.map(({ id }) => id),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const { employee } = await this.deleteEmployeeUseCase.execute({ id });
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
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  async getBySupDepartment(@Param('id') subDepartmentId: string): Promise<any> {
    return this.getEmployeesBySubDepartmentUseCase.execute({ subDepartmentId });
  }

  @Get('can-delete/:id')
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  async canDeleteEmployee(@Param('id') id: string) {
    return this.canDeleteEmployeeUseCase.execute({ employeeId: id });
  }
}
