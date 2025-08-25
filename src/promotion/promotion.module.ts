import { Module } from '@nestjs/common';
import { PromotionRepository } from './domain/repositories/promotion.repository';
import { PrismaPromotionRepository } from './infrastructure/repositories/prisma-promotion.repository';
import { CreatePromotionUseCase } from './application/use-cases/create-promotion.use-case';
import { GetAllPromotionsUseCase } from './application/use-cases/get-all-promotions.use-case';
import { GetPromotionUseCase } from './application/use-cases/get-promotion.use-case';
import { UpdatePromotionUseCase } from './application/use-cases/update-promotion.use-case';
import { DeletePromotionUseCase } from './application/use-cases/delete-promotion.use-case';
import { TogglePromotionActiveUseCase } from './application/use-cases/toggle-promotion-active.use-case';
import { PromotionController } from './interface/http/promotion.controller';
import { GetPromotionForUserUseCase } from './application/use-cases';

@Module({
  providers: [
    { provide: PromotionRepository, useClass: PrismaPromotionRepository },
    CreatePromotionUseCase,
    GetAllPromotionsUseCase,
    GetPromotionUseCase,
    GetPromotionForUserUseCase,
    UpdatePromotionUseCase,
    DeletePromotionUseCase,
    TogglePromotionActiveUseCase,
  ],
  controllers: [PromotionController],
})
export class PromotionModule {}
