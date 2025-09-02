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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: SubmitEmployeeRequestDto,
    requestingUserId: string,
  ): Promise<EmployeeRequest> {
    const supervisor =
      await this.supervisorRepository.findByUserId(requestingUserId);

    const employeeRequest = EmployeeRequest.create({
      requestedBySupervisor: supervisor,
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

    this.eventEmitter.emit(
      StaffRequestedEvent.name,
      new StaffRequestedEvent(
        toReturn.id.toString(),
        supervisor.id.toString(),
        toReturn.createdAt,
        toReturn.newEmployeeFullName,
      ),
    );

    return toReturn;
  }
}
