import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  CreatePromotionUseCase,
  DeletePromotionUseCase,
  GetAllPromotionsUseCase,
  GetPromotionForUserUseCase,
  GetPromotionUseCase,
  TogglePromotionActiveUseCase,
  UpdatePromotionUseCase,
} from '../../application/use-cases';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';
import { CreatePromotionDto } from './dtos/create-promotion.dto';

interface UpdatePromotionDto {
  id: string;
  title?: string;
  attach?: boolean;
  audience?: any;
  startDate?: string;
  endDate?: string;
}

@Controller('promotions')
export class PromotionController {
  constructor(
    private readonly createPromotionUseCase: CreatePromotionUseCase,
    private readonly deletePromotionUseCase: DeletePromotionUseCase,
    private readonly getAllPromotionsUseCase: GetAllPromotionsUseCase,
    private readonly getPromotionForUserUseCase: GetPromotionForUserUseCase,
    private readonly getPromotionUseCase: GetPromotionUseCase,
    private readonly togglePromotionActiveUseCase: TogglePromotionActiveUseCase,
    private readonly updatePromotionUseCase: UpdatePromotionUseCase,
  ) {}

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post()
  async create(@Body() dto: CreatePromotionDto, @Req() req: any) {
    return this.createPromotionUseCase.execute({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      createdByUserId: req.user.id,
    });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Put()
  async update(@Body() dto: UpdatePromotionDto) {
    const { id, ...updateData } = dto;
    return this.updatePromotionUseCase.execute(id, {
      ...updateData,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Get()
  async getAll() {
    return this.getAllPromotionsUseCase.execute();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.getPromotionUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard)
  @Get('user/:userId')
  async getForUser(@Param('userId') userId: string) {
    return this.getPromotionForUserUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Post(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.togglePromotionActiveUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deletePromotionUseCase.execute(id);
  }
}
