import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { TicketCreatedEvent } from '../../domain/events/ticket-created.event';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';

interface CreateSupportTicketInputDto {
  subject: string;
  description: string;
  departmentId: string;
  attach?: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  chooseAttachments?: string[];
}

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly fileService: FilesService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
  ) {}

  async execute(
    dto: CreateSupportTicketInputDto,
  ): Promise<{ ticket: SupportTicket; uploadKey?: string }> {
    // Validate foreign keys
    const [department] = await Promise.all([
      this.departmentRepo.findById(dto.departmentId),
    ]);

    if (!department)
      throw new NotFoundException({ departmentId: 'department_not_found' });

    const now = new Date();
    const ticket = SupportTicket.create({
      subject: dto.subject,
      description: dto.description,
      departmentId: dto.departmentId,
      status: 'NEW' as any,
      createdAt: now,
      updatedAt: now,
      guestName: dto.guestName,
      guestPhone: dto.guestPhone,
      guestEmail: dto.guestEmail,
    });

    const [savedTicket, uploadKey] = await Promise.all([
      this.supportTicketRepo.save(ticket),
      dto.attach
        ? this.fileService.genUploadKey(ticket.id.toString()).then((key) => key)
        : undefined,
      this.notify(ticket),
    ]);

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: savedTicket.id.toString(),
      });
    }

    // Emit ticket created event
    this.eventEmitter.emit(
      TicketCreatedEvent.name,
      new TicketCreatedEvent(
        savedTicket.id.toString(),
        savedTicket.subject,
        savedTicket.departmentId.toString(),
        department.id.toString(), // categoryId - using department as category
        department.parentId?.toString(), // subDepartmentId
        savedTicket.createdAt,
      ),
    );

    return { ticket: savedTicket, uploadKey };
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

    this.notificationRepository.save(notification);
  }
}
