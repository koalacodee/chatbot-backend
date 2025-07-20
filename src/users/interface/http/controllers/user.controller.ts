import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InviteEmployeeUseCase } from 'src/users/application/use-cases/invite-employee-use-case';
import { CompleteAccountUseCase } from 'src/users/application/use-cases/complete-account.use-case';
import { Roles } from 'src/shared/value-objects/role.vo';
import { RolesGuard, UseRoles } from 'src/rbac';
import { InviteEmployeeDto } from '../dto/invite-employee.dto';
import { CompleteAccountDto } from '../dto/complete-account.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(
    private readonly inviteEmployeeUseCase: InviteEmployeeUseCase,
    private readonly completeAccountUseCase: CompleteAccountUseCase,
  ) {}

  @Post('invite-employee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.MANAGER)
  async inviteEmployee(@Body() dto: InviteEmployeeDto) {
    await this.inviteEmployeeUseCase.execute({
      name: dto.name,
      email: dto.email,
      role: Roles.EMPLOYEE,
      expiresIn: dto.expiresIn,
    });
    return { message: 'Invitation sent successfully' };
  }

  @Post('complete-account')
  async completeAccount(@Body() dto: CompleteAccountDto) {
    const user = await this.completeAccountUseCase.execute(dto);
    return { user };
  }
}
