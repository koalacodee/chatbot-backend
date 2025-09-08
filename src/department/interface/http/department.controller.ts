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
  UseInterceptors,
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
  UpdateMainDepartmentUseCase,
  DeleteMainDepartmentUseCase,
  DeleteSubDepartmentUseCase,
} from '../../application/use-cases';
import { GetSharedDepartmentSubDepartmentsUseCase } from '../../application/use-cases/get-shared-department-sub-departments.use-case';
import { GetSharedDepartmentFaqsUseCase } from '../../application/use-cases/get-shared-department-faqs.use-case';
import { GetSharedSubDepartmentFaqsUseCase } from '../../application/use-cases/get-shared-sub-department-faqs.use-case';
import { ViewMainDepartmentsUseCase } from 'src/department/application/use-cases/view-main-departments.use-case';
import { ViewSubDepartmentsUseCase } from 'src/department/application/use-cases/view-sub-departments.use-case';

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
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';

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
    private readonly getSharedDepartmentSubDepartmentsUseCase: GetSharedDepartmentSubDepartmentsUseCase,
    private readonly getSharedDepartmentFaqsUseCase: GetSharedDepartmentFaqsUseCase,
    private readonly getSharedSubDepartmentFaqsUseCase: GetSharedSubDepartmentFaqsUseCase,
  ) {}

  @Get('view/main')
  @UseInterceptors(GuestIdInterceptor)
  async viewMainDepartments(@Query() queryDto: PaginateDto, @Req() req: any) {
    const userId = req.user?.id || req.guest?.id;
    return this.viewMainDepartmentsUseCase.execute({
      ...queryDto,
      guestId: userId,
    });
  }

  @Get('view/sub')
  @UseInterceptors(GuestIdInterceptor)
  async viewSubDepartments(
    @Query() queryDto: GetAllSubDepartmentsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.guest?.id;
    return this.viewSubDepartmentsUseCase.execute({
      ...queryDto,
      guestId: userId,
    });
  }

  @Get('shared/sub-departments')
  @UseInterceptors(GuestIdInterceptor)
  async getSharedDepartmentSubDepartments(
    @Query() query: GetSharedDepartmentDataDto,
  ) {
    return this.getSharedDepartmentSubDepartmentsUseCase.execute({ ...query });
  }

  @Get('shared/faqs')
  @UseInterceptors(GuestIdInterceptor)
  async getSharedDepartmentFaqs(@Query() query: GetSharedDepartmentDataDto) {
    return this.getSharedDepartmentFaqsUseCase.execute({ ...query });
  }

  @Get('shared/sub-department/:subId/faqs')
  @UseInterceptors(GuestIdInterceptor)
  async getSharedSubDepartmentFaqs(
    @Query() query: GetSharedDepartmentDataDto,
    @Param('subId') subDepartmentId: string,
  ) {
    return this.getSharedSubDepartmentFaqsUseCase.execute({
      key: query.key,
      subDepartmentId,
    });
  }

  @AdminAuth()
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

  @AdminAuth()
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

  @AdminAuth()
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

  @AdminAuth()
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
  async generateShareKey(@Param('id') id: string, @Req() req: any) {
    return this.generateShareKeyUseCase.execute({
      departmentId: id,
      userId: req.user.id,
    });
  }
}
