import { Module } from '@nestjs/common';
import { CompleteAccountUseCase } from './application/use-cases/complete-account.use-case';
import { InviteEmployeeUseCase } from './application/use-cases/invite-employee-use-case';
import { UserController } from './interface/http/controllers/user.controller';
import { PromoteUseCase } from './application/use-cases/promote.use-case';
import { DepartmentModule } from 'src/department/department.module';

@Module({
  providers: [CompleteAccountUseCase, InviteEmployeeUseCase, PromoteUseCase],
  controllers: [UserController],
  imports: [DepartmentModule],
})
export class UsersModule {}
