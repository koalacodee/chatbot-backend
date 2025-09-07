import { Injectable, NotFoundException } from '@nestjs/common';
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

interface CreateSupportTicketInputDto {
  guestId: string;
  subject: string;
  description: string;
  departmentId: string;
  attach?: boolean;
}

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly guestRepo: GuestRepository,
    private readonly fileService: FilesService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    dto: CreateSupportTicketInputDto,
  ): Promise<{ ticket: SupportTicket; uploadKey?: string }> {
    // Validate foreign keys
    const [guest, department] = await Promise.all([
      this.guestRepo.findById(dto.guestId),
      this.departmentRepo.findById(dto.departmentId),
    ]);

    if (!guest) throw new NotFoundException({ guestId: 'guest_not_found' });
    if (!department)
      throw new NotFoundException({ departmentId: 'department_not_found' });

    const now = new Date();
    const ticket = SupportTicket.create({
      guestId: dto.guestId,
      subject: dto.subject,
      description: dto.description,
      departmentId: dto.departmentId,
      status: 'NEW' as any,
      createdAt: now,
      updatedAt: now,
    });

    const [uploadKey] = await Promise.all([
      dto.attach
        ? this.fileService.genUploadKey(ticket.id.toString()).then((key) => key)
        : undefined,
      this.supportTicketRepo.save(ticket),
      this.notify(ticket),
    ]);

    return { ticket, uploadKey };
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
