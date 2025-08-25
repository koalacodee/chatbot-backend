import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';

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
  ) {}

  async execute(dto: RejectEmployeeRequestDto): Promise<EmployeeRequest> {
    const employeeRequest = await this.employeeRequestRepository.findById(
      dto.employeeRequestId,
    );

    const admin = await this.adminRepository.findByUserId(dto.adminId);

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (!employeeRequest) {
      throw new NotFoundException('Employee request not found');
    }

    if (employeeRequest.status !== 'PENDING') {
      throw new BadRequestException('Employee request is not pending');
    }

    employeeRequest.status = RequestStatus.REJECTED;
    employeeRequest.rejectionReason = dto.rejectionReason;
    employeeRequest.resolvedByAdmin = admin;
    employeeRequest.resolvedAt = new Date();

    return await this.employeeRequestRepository.save(employeeRequest);
  }
}
