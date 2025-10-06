import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { StaffRequestResolvedEvent } from '../../domain/events/staff-request-resolved.event';

export interface RejectEmployeeRequestDto {
  employeeRequestId: string;
  adminId: string;
  rejectionReason: string;
}

@Injectable()
export class RejectEmployeeRequestUseCase {
  constructor(
    private readonly employeeRequestRepository: EmployeeRequestRepository,
    private readonly adminRepository: AdminRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: RejectEmployeeRequestDto): Promise<EmployeeRequest> {
    const employeeRequest = await this.employeeRequestRepository.findById(
      dto.employeeRequestId,
    );

    const admin = await this.adminRepository.findByUserId(dto.adminId);

    if (!admin) {
      throw new NotFoundException({
        details: [{ field: 'adminId', message: 'Admin not found' }],
      });
    }

    if (!employeeRequest) {
      throw new NotFoundException({
        details: [
          { field: 'employeeRequestId', message: 'Employee request not found' },
        ],
      });
    }

    if (employeeRequest.status !== 'PENDING') {
      throw new BadRequestException({
        details: [
          {
            field: 'employeeRequestId',
            message: 'Employee request is not pending',
          },
        ],
      });
    }

    employeeRequest.status = RequestStatus.REJECTED;
    employeeRequest.rejectionReason = dto.rejectionReason;
    employeeRequest.resolvedByAdmin = admin;
    employeeRequest.resolvedAt = new Date();

    const updatedRequest =
      await this.employeeRequestRepository.save(employeeRequest);

    // Emit staff request resolved event
    this.eventEmitter.emit(
      StaffRequestResolvedEvent.name,
      new StaffRequestResolvedEvent(
        updatedRequest.id.toString(),
        updatedRequest.newEmployeeUsername,
        updatedRequest.requestedBySupervisor.id.toString(),
        'rejected',
        new Date(),
      ),
    );

    return updatedRequest;
  }
}
