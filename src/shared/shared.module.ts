import { Global, Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';

@Global()
@Module({
  providers: [{ provide: UserRepository, useClass: PrismaUserRepository }],
  exports: [UserRepository],
})
export class SharedModule {}
