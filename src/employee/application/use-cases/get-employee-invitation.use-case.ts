import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeInvitationService } from '../../infrastructure/services/employee-invitation.service';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

export interface GetEmployeeInvitationRequest {
  token: string;
}

interface GetEmployeeInvitationResponse {
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  supervisorName: string;
  subDepartmentNames: string[];
  permissions: string[];
  expiresAt: Date;
}

@Injectable()
export class GetEmployeeInvitationUseCase {
  constructor(
    private readonly invitationService: EmployeeInvitationService,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    request: GetEmployeeInvitationRequest,
  ): Promise<GetEmployeeInvitationResponse> {
    // Get invitation data from Redis
    const invitationData = await this.invitationService.getInvitation(
      request.token,
    );
    if (!invitationData) {
      throw new NotFoundException({
        details: [
          { field: 'token', message: 'Invalid or expired invitation token' },
        ],
      });
    }

    // Get sub-department names
    const subDepartments = await this.departmentRepository.findByIds(
      invitationData.subDepartmentIds,
    );
    const subDepartmentNames = subDepartments.map((dept) => dept.name);

    // Get supervisor name
    const supervisor = await this.supervisorRepository.findById(
      invitationData.supervisorId,
    );
    const supervisorName = supervisor?.user?.name || 'Unknown Supervisor';

    return {
      fullName: invitationData.fullName,
      email: invitationData.email,
      employeeId: invitationData.employeeId,
      jobTitle: invitationData.jobTitle,
      supervisorName,
      subDepartmentNames,
      permissions: invitationData.permissions,
      expiresAt: invitationData.expiresAt,
    };
  }
}
