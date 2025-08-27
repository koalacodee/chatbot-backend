import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { GetAllKnowledgeChunksOutputDto } from './dto/get-all-knowledge-chunks.dto';
import { DeleteManyKnowledgeChunksInputDto } from './dto/delete-many-knowledge-chunks.dto';
import { FindKnowledgeChunksByDepartmentInputDto } from './dto/find-by-department.dto';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

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
  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  async create(
    @Body() input: CreateKnowledgeChunkInputDto,
    @Req() req: any,
  ): Promise<KnowledgeChunk> {
    return this.createUseCase.execute({ ...input, userId: req.user.id });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Put()
  async update(
    @Body() input: UpdateKnowledgeChunkInputDto,
    @Req() req: any,
  ): Promise<KnowledgeChunk> {
    const { id, ...dto } = input;
    return this.updateUseCase.execute(id, { ...dto, userId: req.user.id });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Get(':id')
  async get(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetKnowledgeChunkOutputDto | null> {
    return this.getUseCase.execute(id, req.user.id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Get()
  async getAll(@Req() req: any): Promise<GetAllKnowledgeChunksOutputDto> {
    return this.getAllUseCase.execute(req.user.id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Get('by-department')
  async findByDepartment(
    @Query() input: FindKnowledgeChunksByDepartmentInputDto,
  ): Promise<KnowledgeChunk[]> {
    return this.findByDepartmentUseCase.execute(input);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<GetKnowledgeChunkOutputDto | null> {
    return this.deleteUseCase.execute(id, req.user.id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyKnowledgeChunksInputDto,
    @Req() req: any,
  ): Promise<KnowledgeChunk[]> {
    return this.deleteManyUseCase.execute(input.ids, req.user.id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.ADMIN)
  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}
