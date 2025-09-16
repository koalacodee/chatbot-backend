import { Injectable } from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRequestedEvent } from '../listeners/staff-requested.listener';
import { StaffRequestCreatedEvent } from '../../domain/events/staff-request-created.event';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Notification } from 'src/notification/domain/entities/notification.entity';

export interface SubmitEmployeeRequestDto {
  newEmployeeId?: string;
  newEmployeeEmail: string;
  newEmployeeFullName: string;
  newEmployeeUsername: string;
  newEmployeeJobTitle: string;
  temporaryPassword: string;
  newEmployeeDesignation?: string;
}

@Injectable()
export class SubmitEmployeeRequestUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    dto: SubmitEmployeeRequestDto,
    requestingUserId: string,
  ): Promise<EmployeeRequest> {
    const supervisor =
      await this.supervisorRepository.findByUserId(requestingUserId);

    const employeeRequest = EmployeeRequest.create({
      requestedBySupervisor: supervisor,
      requestedBySupervisorId: supervisor.id.toString(),
      newEmployeeEmail: Email.create(dto.newEmployeeEmail),
      newEmployeeFullName: dto.newEmployeeFullName,
      newEmployeeUsername: dto.newEmployeeUsername,
      newEmployeeJobTitle: dto.newEmployeeJobTitle,
      temporaryPassword: dto.temporaryPassword,
      newEmployeeDesignation: dto.newEmployeeDesignation,
      newEmployeeId: dto.newEmployeeId,
      status: RequestStatus.PENDING,
    });

    const toReturn = await this.employeeRequestRepository.save(employeeRequest);

    // Emit both old and new events for backward compatibility
    this.eventEmitter.emit(
      StaffRequestedEvent.name,
      new StaffRequestedEvent(
        toReturn.id.toString(),
        supervisor.id.toString(),
        toReturn.createdAt,
        toReturn.newEmployeeFullName,
      ),
    );

    // Emit new staff request created event
    this.eventEmitter.emit(
      StaffRequestCreatedEvent.name,
      new StaffRequestCreatedEvent(
        toReturn.id.toString(),
        toReturn.newEmployeeUsername,
        supervisor.id.toString(),
        toReturn.createdAt,
      ),
    );

    return toReturn;
  }
}
