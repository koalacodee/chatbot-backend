import { Injectable, NotFoundException } from '@nestjs/common';
import { SupervisorInvitationService } from '../../infrastructure/services/supervisor-invitation.service';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';

export interface GetSupervisorInvitationRequest {
  token: string;
}

interface GetSupervisorInvitationResponse {
  name: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  departmentNames: string[];
  permissions: string[];
  expiresAt: Date;
}

@Injectable()
export class GetSupervisorInvitationUseCase {
  constructor(
    private readonly invitationService: SupervisorInvitationService,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(
    request: GetSupervisorInvitationRequest,
  ): Promise<GetSupervisorInvitationResponse> {
    // Get invitation data from Redis
    const invitationData = await this.invitationService.getInvitation(
      request.token,
    );
    if (!invitationData) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    // Get department names
    const departments = await this.departmentRepository.findByIds(
      invitationData.departmentIds,
    );
    const departmentNames = departments.map((dept) => dept.name);

    return {
      name: invitationData.name,
      email: invitationData.email,
      employeeId: invitationData.employeeId,
      jobTitle: invitationData.jobTitle,
      departmentNames,
      permissions: invitationData.permissions,
      expiresAt: invitationData.expiresAt,
    };
  }
}
