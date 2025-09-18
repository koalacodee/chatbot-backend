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
  CreateKnowledgeChunkUseCase,
  UpdateKnowledgeChunkUseCase,
  GetKnowledgeChunkUseCase,
  GetAllKnowledgeChunksUseCase,
  DeleteKnowledgeChunkUseCase,
  DeleteManyKnowledgeChunksUseCase,
  CountKnowledgeChunksUseCase,
  FindKnowledgeChunksByDepartmentUseCase,
} from '../../application/use-cases';
import { CreateKnowledgeChunkInputDto } from './dto/create-knowledge-chunk.dto';
import { UpdateKnowledgeChunkInputDto } from './dto/update-knowledge-chunk.dto';
import { GetKnowledgeChunkOutputDto } from './dto/get-knowledge-chunk.dto';
import { DeleteManyKnowledgeChunksInputDto } from './dto/delete-many-knowledge-chunks.dto';
import { FindKnowledgeChunksByDepartmentInputDto } from './dto/find-by-department.dto';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

@Controller('knowledge-chunks')
export class KnowledgeChunkController {
  constructor(
    private readonly createUseCase: CreateKnowledgeChunkUseCase,
    private readonly updateUseCase: UpdateKnowledgeChunkUseCase,
    private readonly getUseCase: GetKnowledgeChunkUseCase,
    private readonly getAllUseCase: GetAllKnowledgeChunksUseCase,
    private readonly deleteUseCase: DeleteKnowledgeChunkUseCase,
    private readonly deleteManyUseCase: DeleteManyKnowledgeChunksUseCase,
    private readonly countUseCase: CountKnowledgeChunksUseCase,
    private readonly findByDepartmentUseCase: FindKnowledgeChunksByDepartmentUseCase,
  ) {}

  @Post()
  @EmployeePermissions(EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS)
  async create(
    @Body() input: CreateKnowledgeChunkInputDto,
    @Req() req: any,
  ): Promise<{ knowledgeChunk: KnowledgeChunk; uploadKey?: string }> {
    return this.createUseCase.execute({ ...input, userId: req.user.id });
  }

  @EmployeePermissions(EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS)
  @Put()
  async update(
    @Body() input: UpdateKnowledgeChunkInputDto,
    @Req() req: any,
  ): Promise<{ knowledgeChunk: KnowledgeChunk; uploadKey?: string }> {
    const { id, ...dto } = input;
    return this.updateUseCase.execute(id, { ...dto, userId: req.user.id });
  }

  @EmployeePermissions(EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS)
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetKnowledgeChunkOutputDto | null> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS)
  @Get()
  async getAll(@Req() req: any): Promise<{
    knowledgeChunks: KnowledgeChunk[];
    attachments: { [chunkId: string]: string[] };
  }> {
    return this.getAllUseCase.execute(req.user.id);
  }

  @SupervisorPermissions()
  @Get('by-department')
  async findByDepartment(
    @Query() input: FindKnowledgeChunksByDepartmentInputDto,
  ): Promise<KnowledgeChunk[]> {
    return this.findByDepartmentUseCase.execute(input);
  }

  @SupervisorPermissions()
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetKnowledgeChunkOutputDto | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @SupervisorPermissions()
  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyKnowledgeChunksInputDto,
    @Req() req: any,
  ): Promise<KnowledgeChunk[]> {
    return this.deleteManyUseCase.execute(input.ids, req.user.id);
  }

  @EmployeePermissions(EmployeePermissionsEnum.MANAGE_KNOWLEDGE_CHUNKS)
  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}
