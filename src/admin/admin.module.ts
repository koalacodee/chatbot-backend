import { Global, Module } from '@nestjs/common';
import { AdminRepository } from './domain/repositories/admin.repository';
import { PrismaAdminRepository } from './infrastructure/repositories/prisma-admin.repository';

@Global()
@Module({
  providers: [{ provide: AdminRepository, useClass: PrismaAdminRepository }],
  exports: [AdminRepository],
})
export class AdminModule {}
