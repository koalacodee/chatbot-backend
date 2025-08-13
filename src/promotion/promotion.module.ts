import { Module } from '@nestjs/common';
import { PromotionRepository } from './domain/repositories/promotion.repository';
import { PrismaPromotionRepository } from './infrastructure/repositories/prisma-promotion.repository';

@Module({
  providers: [
    { provide: PromotionRepository, useClass: PrismaPromotionRepository },
  ],
  exports: [PromotionRepository],
})
export class PromotionModule {}
