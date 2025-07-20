import { Global, Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { RedisService } from './infrastructure/redis';
import { EmailModule } from './infrastructure/email/email.module';

@Global()
@Module({
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    RedisService,
  ],
  exports: [UserRepository, RedisService],
  imports: [EmailModule],
})
export class SharedModule {}
