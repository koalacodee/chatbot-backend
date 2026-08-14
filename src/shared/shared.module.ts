import { Global, Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { RedisService } from './infrastructure/redis';
import { EmailModule } from './infrastructure/email/email.module';
import { DrizzleUserRepository } from './infrastructure/repositories/drizzle-user.repository';

@Global()
@Module({
  providers: [
    { provide: UserRepository, useClass: DrizzleUserRepository },
    RedisService,
  ],
  exports: [UserRepository, RedisService],
  imports: [EmailModule],
})
export class SharedModule {}
