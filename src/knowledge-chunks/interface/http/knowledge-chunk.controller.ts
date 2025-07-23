import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';

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
  async create(
    @Body() input: CreateKnowledgeChunkInputDto,
  ): Promise<KnowledgeChunk> {
    return this.createUseCase.execute(input);
  }

  @Put()
  async update(
    @Body() input: UpdateKnowledgeChunkInputDto,
  ): Promise<KnowledgeChunk> {
    const { id, ...dto } = input;
    return this.updateUseCase.execute(id, dto);
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
  ): Promise<GetKnowledgeChunkOutputDto | null> {
    return this.getUseCase.execute(id);
  }

  @Get()
  async getAll(): Promise<GetAllKnowledgeChunksOutputDto> {
    return this.getAllUseCase.execute();
  }

  @Get('by-department')
  async findByDepartment(
    @Query() input: FindKnowledgeChunksByDepartmentInputDto,
  ): Promise<KnowledgeChunk[]> {
    return this.findByDepartmentUseCase.execute(input);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
  ): Promise<GetKnowledgeChunkOutputDto | null> {
    return this.deleteUseCase.execute(id);
  }

  @Delete('multiple')
  async deleteMany(
    @Body() input: DeleteManyKnowledgeChunksInputDto,
  ): Promise<KnowledgeChunk[]> {
    return this.deleteManyUseCase.execute(input.ids);
  }

  @Get('count')
  async count(): Promise<number> {
    return this.countUseCase.execute();
  }
}
