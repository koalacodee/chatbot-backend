import { Injectable } from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

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

    return await this.employeeRequestRepository.save(employeeRequest);
  }
}
