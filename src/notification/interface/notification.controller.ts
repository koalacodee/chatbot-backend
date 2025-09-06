import { Controller, Get, Req } from '@nestjs/common';
import { EmployeePermissions } from 'src/rbac/decorators';
import { GetUnseenNotificationsUseCase } from '../application/use-cases/get-unseen-notifications.use-case';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly getUnseenNotificationsUseCase: GetUnseenNotificationsUseCase,
  ) {}

  @Get()
  @EmployeePermissions()
  geAll(@Req() req: any): any {
    return this.getUnseenNotificationsUseCase
      .execute(req.user.id)
      .then((val) => val.map((val) => val.toJSON()));
  }
}
