import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  CreateDepartmentUseCase,
  CreateSubDepartmentUseCase,
  GetDepartmentUseCase,
  GetAllDepartmentsUseCase,
  DeleteManyDepartmentsUseCase,
  CountDepartmentsUseCase,
  GetAllSubDepartmentsUseCase,
  CanDeleteUseCase,
  UpdateSubDepartmentUseCase,
} from '../../application/use-cases';
import { UpdateMainDepartmentUseCase } from '../../application/use-cases/update-main-department.use-case';
import { DeleteMainDepartmentUseCase } from '../../application/use-cases/delete-main-department.use-case';
import { DeleteSubDepartmentUseCase } from '../../application/use-cases/delete-sub-department.use-case';
import { CreateDepartmentInputDto } from './dto/create-department.dto';
import {
  UpdateDepartmentInputDto,
  UpdateSubDepartmentInputDto,
} from './dto/update-department.dto';
import { GetDepartmentOutputDto } from './dto/get-department.dto';
import { GetAllDepartmentsOutputDto } from './dto/get-all-departments.dto';
import { DeleteManyDepartmentsInputDto } from './dto/delete-many-departments.dto';
import { Department } from '../../domain/entities/department.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';
import { CreateSubDepartmentDto } from './dto/create-sub-department.dto';
import { GetAllSubDepartmentsDto } from './dto/get-all-sub-departments.dto';
import { ViewMainDepartmentsUseCase } from 'src/department/application/use-cases/view-main-departments.use-case';
import { ViewSubDepartmentsUseCase } from 'src/department/application/use-cases/view-sub-departments.use-case';
import { PaginateDto } from './dto/paginate.dto';

@Controller('department')
export class DepartmentController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly createSubDepartmentUseCase: CreateSubDepartmentUseCase,
    private readonly updateMainDepartmentUseCase: UpdateMainDepartmentUseCase,
    private readonly updateSubDepartmentUseCase: UpdateSubDepartmentUseCase,
    private readonly getDepartmentUseCase: GetDepartmentUseCase,
    private readonly getAllDepartmentsUseCase: GetAllDepartmentsUseCase,
    private readonly deleteMainDepartmentUseCase: DeleteMainDepartmentUseCase,
    private readonly deleteSubDepartmentUseCase: DeleteSubDepartmentUseCase,
    private readonly deleteManyDepartmentsUseCase: DeleteManyDepartmentsUseCase,
    private readonly countDepartmentsUseCase: CountDepartmentsUseCase,
    private readonly getAllSubDepartmentsUseCase: GetAllSubDepartmentsUseCase,
    private readonly canDeleteUseCase: CanDeleteUseCase,
    private readonly viewMainDepartmentsUseCase: ViewMainDepartmentsUseCase,
    private readonly viewSubDepartmentsUseCase: ViewSubDepartmentsUseCase,
  ) {}

  @Get('view/main')
  async viewMainDepartments(@Query() queryDto: PaginateDto) {
    return this.viewMainDepartmentsUseCase.execute(queryDto);
  }

  @Get('view/sub')
  async viewSubDepartments(@Query() queryDto: GetAllSubDepartmentsDto) {
    return this.viewSubDepartmentsUseCase.execute(queryDto);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN)
  @Post()
  async create(@Body() input: CreateDepartmentInputDto): Promise<Department> {
    return this.createDepartmentUseCase.execute(input);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post('sub-department')
  async createSubDepartment(
    @Body() input: CreateSubDepartmentDto,
  ): Promise<Department> {
    return this.createSubDepartmentUseCase.execute(input);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN)
  @Put('main/:id')
  async updateMainDepartment(
    @Body() input: UpdateDepartmentInputDto,
    @Param('id') id: string,
  ): Promise<Department> {
    return this.updateMainDepartmentUseCase.execute(id, input);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put('sub/:id')
  async updateSubDepartment(
    @Body() input: UpdateSubDepartmentInputDto,
    @Param('id') id: string,
  ): Promise<Department> {
    return this.updateSubDepartmentUseCase.execute(id, input);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get()
  async getAllSubDepartments(): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllDepartmentsUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('sub-departments')
  async getAllDepartments(
    @Query() queryDto: GetAllSubDepartmentsDto,
  ): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllSubDepartmentsUseCase.execute(queryDto);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get(':id')
  async get(@Param('id') id: string): Promise<GetDepartmentOutputDto | null> {
    return this.getDepartmentUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('all')
  async getAll(): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllDepartmentsUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN)
  @Delete('main/:id')
  async deleteMainDepartment(
    @Param('id') id: string,
  ): Promise<GetDepartmentOutputDto | null> {
    return this.deleteMainDepartmentUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN)
  @Delete('main/multiple')
  async deleteMultipleMainDepartments(
    @Body() input: DeleteManyDepartmentsInputDto,
  ): Promise<Department[]> {
    return this.deleteManyDepartmentsUseCase.execute(input.ids);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete('sub/:id')
  async deleteSubDepartment(
    @Param('id') id: string,
  ): Promise<GetDepartmentOutputDto | null> {
    return this.deleteSubDepartmentUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete('sub/multiple')
  async deleteMultipleSubDepartments(
    @Body() input: DeleteManyDepartmentsInputDto,
  ): Promise<Department[]> {
    return this.deleteManyDepartmentsUseCase.execute(input.ids);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN)
  @Get('count')
  async count(): Promise<number> {
    return this.countDepartmentsUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('can-delete/:id')
  async canDelete(@Param('id') id: string) {
    return this.canDeleteUseCase.execute({ id });
  }
}
