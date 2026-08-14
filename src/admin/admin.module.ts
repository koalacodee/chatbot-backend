import { Global, Module } from '@nestjs/common';
import { AdminRepository } from './domain/repositories/admin.repository';
import { DrizzleAdminRepository } from './infrastructure/repositories/drizzle-admin.repository';

@Global()
@Module({
  providers: [{ provide: AdminRepository, useClass: DrizzleAdminRepository }],
  exports: [AdminRepository],
})
export class AdminModule {}
