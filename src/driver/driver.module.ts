import { Global, Module } from '@nestjs/common';
import { PrismaDriverRepository } from './infrastructure/repositories/prisma-driver.repository';
import { DriverRepository } from './domain/repositories/driver.repository';
import * as useCases from './application/use-cases';
import { DriverController } from './interface/http/driver.controller';

@Global()
@Module({
  providers: [
    {
      provide: DriverRepository,
      useClass: PrismaDriverRepository,
    },
    ...Object.values(useCases),
  ],
  exports: [DriverRepository],
  controllers: [DriverController],
})
export class DriverModule {}
