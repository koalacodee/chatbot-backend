import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  CreateDepartmentUseCase,
  UpdateDepartmentUseCase,
  GetDepartmentUseCase,
  GetAllDepartmentsUseCase,
  DeleteDepartmentUseCase,
  DeleteManyDepartmentsUseCase,
  CountDepartmentsUseCase,
} from '../../application/use-cases';
import { CreateDepartmentInputDto } from './dto/create-department.dto';
import { UpdateDepartmentInputDto } from './dto/update-department.dto';
import { GetDepartmentOutputDto } from './dto/get-department.dto';
import { GetAllDepartmentsOutputDto } from './dto/get-all-departments.dto';
import { DeleteManyDepartmentsInputDto } from './dto/delete-many-departments.dto';
import { Department } from '../../domain/entities/department.entity';

@Controller('department')
export class DepartmentController {
  constructor(
    private readonly createDepartmentUseCase: CreateDepartmentUseCase,
    private readonly updateDepartmentUseCase: UpdateDepartmentUseCase,
    private readonly getDepartmentUseCase: GetDepartmentUseCase,
    private readonly getAllDepartmentsUseCase: GetAllDepartmentsUseCase,
    private readonly deleteDepartmentUseCase: DeleteDepartmentUseCase,
    private readonly deleteManyDepartmentsUseCase: DeleteManyDepartmentsUseCase,
    private readonly countDepartmentsUseCase: CountDepartmentsUseCase,
  ) {}

  @Post()
  async create(@Body() input: CreateDepartmentInputDto): Promise<Department> {
    return this.createDepartmentUseCase.execute(input);
  }

  @Put()
  async update(@Body() input: UpdateDepartmentInputDto): Promise<Department> {
    const { id, ...dto } = input;
    return this.updateDepartmentUseCase.execute(id, dto);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetDepartmentOutputDto | null> {
    return this.getDepartmentUseCase.execute(id);
  }

  @Get()
  async getAll(): Promise<GetAllDepartmentsOutputDto> {
    return this.getAllDepartmentsUseCase.execute();
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
  ): Promise<GetDepartmentOutputDto | null> {
    return this.deleteDepartmentUseCase.execute(id);
  }

  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyDepartmentsInputDto,
  ): Promise<Department[]> {
    return this.deleteManyDepartmentsUseCase.execute(input.ids);
  }

  @Get('count')
  async count(): Promise<number> {
    return this.countDepartmentsUseCase.execute();
  }
}
