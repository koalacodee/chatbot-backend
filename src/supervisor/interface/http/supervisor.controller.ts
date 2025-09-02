import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { AddSupervisorByAdminUseCase } from '../../application/use-cases/add-supervisor-by-admin.use-case';
import { AddSupervisorByAdminDto } from './dtos/add-supervisor-by-admin.dto';
import { SearchSupervisorUseCase } from 'src/supervisor/application/use-cases/search-supervisor.use-case';
import { CanDeleteUseCase } from 'src/supervisor/application/use-cases/can-delete.use-case';
import { DeleteSupervisorUseCase } from 'src/supervisor/application/use-cases/delete-supervisor.use-case';
import { UpdateSupervisorUseCase } from 'src/supervisor/application/use-cases/update-supervisor.use-case';
import { UpdateSupervisorDto } from './dtos/update-supervisor.dto';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';

interface SearchSupervisorQuery {
  search: string;
}

@Controller('supervisors')
export class SupervisorController {
  constructor(
    private readonly searchSupervisorUseCase: SearchSupervisorUseCase,
    private readonly addSupervisorByAdminUseCase: AddSupervisorByAdminUseCase,
    private readonly canDeleteUseCase: CanDeleteUseCase,
    private readonly deleteSupervisorUseCase: DeleteSupervisorUseCase,
    private readonly updateSupervisorUseCase: UpdateSupervisorUseCase,
  ) {}

  @AdminAuth()
  @Get('search')
  async search(@Query() query: SearchSupervisorQuery): Promise<any> {
    return this.searchSupervisorUseCase.execute({
      search: query.search,
    });
  }

  @Post()
  @AdminAuth()
  @HttpCode(HttpStatus.CREATED)
  async addSupervisorByAdmin(
    @Body() addSupervisorDto: AddSupervisorByAdminDto,
  ): Promise<any> {
    const result =
      await this.addSupervisorByAdminUseCase.execute(addSupervisorDto);

    return {
      message: 'Supervisor added successfully',
      supervisor: result.supervisor.toJSON(),
      user: {
        id: result.user.id.toString(),
        name: result.user.name,
        email: result.user.email.toString(),
        username: result.user.username,
        role: result.user.role.getRole(),
        employeeId: result.user.employeeId,
        jobTitle: result.user.jobTitle,
      },
    };
  }

  @Get('can-delete/:id')
  @AdminAuth()
  @HttpCode(HttpStatus.OK)
  async canDelete(@Param('id') id: string): Promise<any> {
    return this.canDeleteUseCase.execute(id);
  }

  @Delete(':id')
  @AdminAuth()
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<any> {
    return this.deleteSupervisorUseCase.execute(id);
  }

  @Put(':id')
  @AdminAuth()
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateSupervisorDto,
  ): Promise<any> {
    return this.updateSupervisorUseCase.execute(id, body);
  }
}
