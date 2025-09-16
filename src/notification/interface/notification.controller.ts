import { Controller, Get, Post, Req } from '@nestjs/common';
import { EmployeePermissions } from 'src/rbac/decorators';
import { GetUnseenNotificationsUseCase } from '../application/use-cases/get-unseen-notifications.use-case';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketCreatedEvent } from 'src/support-tickets/domain/events/ticket-created.event';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly getUnseenNotificationsUseCase: GetUnseenNotificationsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @EmployeePermissions()
  geAll(@Req() req: any): any {
    return this.getUnseenNotificationsUseCase
      .execute({ userId: req.user.id })
      .then((val) => ({
        ...val,
        notifications: val.notifications.map((val) => val.toJSON()),
      }));
  }

  @Post('test')
  @EmployeePermissions()
  async testNotification(@Req() req: any): Promise<any> {
    // Emit a test ticket created event
    this.eventEmitter.emit(
      TicketCreatedEvent.name,
      new TicketCreatedEvent(
        'test-ticket-123',
        'Test Ticket Subject',
        'test-department-123',
        'test-category-123',
        'test-sub-department-123',
        new Date(),
      ),
    );

    return { message: 'Test notification event emitted' };
  }
}
