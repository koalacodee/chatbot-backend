import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
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
  GenerateShareKeyUseCase,
} from '../../application/use-cases';
import { GetSharedDepartmentDataUseCase } from '../../application/use-cases/get-shared-department-data.use-case';
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
import { SupervisorPermissions } from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { CreateSubDepartmentDto } from './dto/create-sub-department.dto';
import { GetAllSubDepartmentsDto } from './dto/get-all-sub-departments.dto';
import { PaginateDto } from './dto/paginate.dto';
import { GetSharedDepartmentDataDto } from './dto/get-shared-department-data.dto';
import { ViewMainDepartmentsUseCase } from 'src/department/application/use-cases/view-main-departments.use-case';
import { ViewSubDepartmentsUseCase } from 'src/department/application/use-cases/view-sub-departments.use-case';

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
    private readonly generateShareKeyUseCase: GenerateShareKeyUseCase,
    private readonly getSharedDepartmentDataUseCase: GetSharedDepartmentDataUseCase,
  ) {}

  @Get('view/main')
  async viewMainDepartments(@Query() queryDto: PaginateDto) {
    return this.viewMainDepartmentsUseCase.execute(queryDto);
  }

  @Get('view/sub')
  async viewSubDepartments(@Query() queryDto: GetAllSubDepartmentsDto) {
    return this.viewSubDepartmentsUseCase.execute(queryDto);
  }

  @Get('shared')
  async getSharedDepartmentData(@Query() query: GetSharedDepartmentDataDto) {
    return this.getSharedDepartmentDataUseCase.execute(query);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_DEPARTMENTS)
  @Post()
  async create(@Body() input: CreateDepartmentInputDto): Promise<Department> {
    return this.createDepartmentUseCase.execute(input);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS)
  @Post('sub-department')
  async createSubDepartment(
    @Body() input: CreateSubDepartmentDto,
  ): Promise<Department> {
    return this.createSubDepartmentUseCase.execute(input);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_DEPARTMENTS)
  @Put('main/:id')
  async updateMainDepartment(
    @Body() input: UpdateDepartmentInputDto,
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Department> {
    return this.updateMainDepartmentUseCase.execute(id, input, req.user.id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS)
  @Put('sub/:id')
  async updateSubDepartment(
    @Body() input: UpdateSubDepartmentInputDto,
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Department> {
    return this.updateSubDepartmentUseCase.execute(id, input, req.user.id);
  }

  @SupervisorPermissions()
  @Get()
  async getAllSubDepartments(
    @Req() req: any,
  ): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllDepartmentsUseCase.execute(req.user.id);
  }

  @SupervisorPermissions()
  @Get('sub-departments')
  async getAllDepartments(
    @Query() queryDto: GetAllSubDepartmentsDto,
    @Req() req: any,
  ): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllSubDepartmentsUseCase.execute(queryDto, req.user.id);
  }

  @SupervisorPermissions()
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetDepartmentOutputDto | null> {
    return this.getDepartmentUseCase.execute(id, req.user.id);
  }

  @SupervisorPermissions()
  @Get('all')
  async getAll(@Req() req: any): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllDepartmentsUseCase.execute(req.user.id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_DEPARTMENTS)
  @Delete('main/:id')
  async deleteMainDepartment(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetDepartmentOutputDto | null> {
    return this.deleteMainDepartmentUseCase.execute(id, req.user.id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS)
  @Delete('main/multiple')
  async deleteMultipleMainDepartments(
    @Body() input: DeleteManyDepartmentsInputDto,
  ): Promise<Department[]> {
    return this.deleteManyDepartmentsUseCase.execute(input.ids);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS)
  @Delete('sub/:id')
  async deleteSubDepartment(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetDepartmentOutputDto | null> {
    return this.deleteSubDepartmentUseCase.execute(id, req.user.id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS)
  @Delete('sub/multiple')
  async deleteMultipleSubDepartments(
    @Body() input: DeleteManyDepartmentsInputDto,
  ): Promise<Department[]> {
    return this.deleteManyDepartmentsUseCase.execute(input.ids);
  }

  @SupervisorPermissions()
  @Get('count')
  async count(): Promise<number> {
    return this.countDepartmentsUseCase.execute();
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_DEPARTMENTS)
  @Get('can-delete/main/:id')
  async canDeleteMainDepartment(@Param('id') id: string, @Req() req: any) {
    return this.canDeleteUseCase.execute({ id, userId: req.user.id });
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUB_DEPARTMENTS)
  @Get('can-delete/sub/:id')
  async canDeleteSubDepartment(@Param('id') id: string, @Req() req: any) {
    return this.canDeleteUseCase.execute({
      id,
      isSubDepartment: true,
      userId: req.user.id,
    });
  }

  @SupervisorPermissions()
  @Post('share/:id')
  async generateShareKey(@Param('id') id: string) {
    return this.generateShareKeyUseCase.execute({ departmentId: id });
  }
}
