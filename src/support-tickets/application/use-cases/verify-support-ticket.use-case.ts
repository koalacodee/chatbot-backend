import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupportTicket, SupportTicketStatus } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { RedisTicketStorageService } from '../../infrastructure/services/redis-ticket-storage.service';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { Notification } from 'src/notification/domain/entities/notification.entity';

interface VerifySupportTicketInput {
  verificationCode: string;
}

interface VerifySupportTicketOutput {
  ticket: SupportTicket;
  message: string;
}

@Injectable()
export class VerifySupportTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly redisTicketStorage: RedisTicketStorageService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    dto: VerifySupportTicketInput,
  ): Promise<VerifySupportTicketOutput> {
    // Validate code
    const isValid = await this.redisTicketStorage.isTokenValid(dto.verificationCode);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Retrieve ticket from Redis
    const ticketData = await this.redisTicketStorage.retrieveTemporaryTicket(dto.verificationCode);
    if (!ticketData) {
      throw new NotFoundException('Ticket not found or already verified');
    }

    // Reconstruct ticket from stored data
    const ticket = SupportTicket.create({
      subject: ticketData.ticket.subject,
      description: ticketData.ticket.description,
      departmentId: ticketData.ticket.departmentId,
      status: SupportTicketStatus.NEW,
      createdAt: new Date(ticketData.ticket.createdAt),
      updatedAt: new Date(),
      guestName: ticketData.ticket.guestName,
      guestPhone: ticketData.ticket.guestPhone,
      guestEmail: ticketData.ticket.guestEmail,
    });

    // Save ticket to database
    const savedTicket = await this.supportTicketRepo.save(ticket);

    // Clean up Redis storage
    await this.redisTicketStorage.deleteTemporaryTicket(dto.verificationCode);

    // Send notifications
    await this.notify(savedTicket);

    return {
      ticket: savedTicket,
      message: 'Support ticket verified and submitted successfully',
    };
  }

  async notify(supportTicket: SupportTicket) {
    const supervisors = await this.supervisorRepository.findManyByDepartmentId(
      supportTicket.departmentId.toString(),
    );
    const employees = await this.employeeRepository.findBySupervisorIds(
      supervisors.map(({ id }) => id.toString()),
      [EmployeePermissionsEnum.HANDLE_TICKETS],
    );

    const notification = Notification.create({
      type: 'ticket_opened',
      title: supportTicket.subject,
    });
    [
      ...supervisors.map(({ userId }) => userId.toString()),
      ...employees.map(({ userId }) => userId.toString()),
    ].forEach((id) => notification.addRecipient(id));

    await this.notificationRepository.save(notification);
  }
}
