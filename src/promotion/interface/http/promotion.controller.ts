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
  UseInterceptors,
} from '@nestjs/common';
import {
  CreatePromotionUseCase,
  DeletePromotionUseCase,
  GetAllPromotionsUseCase,
  GetPromotionForUserUseCase,
  GetPromotionForCustomerUseCase,
  GetPromotionUseCase,
  TogglePromotionActiveUseCase,
  UpdatePromotionUseCase,
} from '../../application/use-cases';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { CreatePromotionDto } from './dtos/create-promotion.dto';
import { SupervisorPermissions } from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';

interface UpdatePromotionDto {
  id: string;
  title?: string;
  attach?: boolean;
  audience?: any;
  startDate?: string;
  endDate?: string;
  deleteAttachments?: string[];
}

@Controller('promotions')
export class PromotionController {
  constructor(
    private readonly createPromotionUseCase: CreatePromotionUseCase,
    private readonly deletePromotionUseCase: DeletePromotionUseCase,
    private readonly getAllPromotionsUseCase: GetAllPromotionsUseCase,
    private readonly getPromotionForUserUseCase: GetPromotionForUserUseCase,
    private readonly getPromotionForCustomerUseCase: GetPromotionForCustomerUseCase,
    private readonly getPromotionUseCase: GetPromotionUseCase,
    private readonly togglePromotionActiveUseCase: TogglePromotionActiveUseCase,
    private readonly updatePromotionUseCase: UpdatePromotionUseCase,
  ) {}

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_PROMOTIONS)
  @Post()
  async create(@Body() dto: CreatePromotionDto, @Req() req: any) {
    return this.createPromotionUseCase.execute({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      createdByUserId: req.user.id,
    });
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_PROMOTIONS)
  @Put()
  async update(@Body() dto: UpdatePromotionDto) {
    const { id, ...updateData } = dto;
    return this.updatePromotionUseCase.execute(id, {
      ...updateData,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_PROMOTIONS)
  @Get()
  async getAll() {
    return this.getAllPromotionsUseCase.execute();
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_PROMOTIONS)
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.getPromotionUseCase.execute(id);
  }

  @UseGuards(UserJwtAuthGuard)
  @Get('user')
  async getForUser(@Req() req: any): Promise<any> {
    return this.getPromotionForUserUseCase.execute({ userId: req.user.id });
  }

  @UseInterceptors(GuestIdInterceptor)
  @Get('customer')
  async getForCustomer(): Promise<any> {
    return this.getPromotionForCustomerUseCase.execute();
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_PROMOTIONS)
  @Post(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.togglePromotionActiveUseCase.execute(id);
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_PROMOTIONS)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deletePromotionUseCase.execute(id);
  }
}
