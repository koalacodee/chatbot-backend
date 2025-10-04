import { Injectable } from '@nestjs/common';
import { SupervisorInvitationService } from '../../infrastructure/services/supervisor-invitation.service';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

export interface GetSupervisorInvitationsRequest {
  status?: 'pending' | 'completed' | 'expired';
  page?: number;
  limit?: number;
}

export interface SupervisorInvitationStatus {
  token: string;
  name: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  departmentNames: string[];
  permissions: string[];
  status: 'pending' | 'completed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

interface GetSupervisorInvitationsResponse {
  invitations: SupervisorInvitationStatus[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetSupervisorInvitationsUseCase {
  constructor(
    private readonly invitationService: SupervisorInvitationService,
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    request: GetSupervisorInvitationsRequest,
  ): Promise<GetSupervisorInvitationsResponse> {
    const page = request.page || 1;
    const limit = request.limit || 10;
    const offset = (page - 1) * limit;

    // Get all invitation tokens from Redis
    const invitationTokens =
      await this.invitationService.getAllInvitationTokens();

    // Get invitation data for each token
    const invitationPromises = invitationTokens.map(async (token) => {
      const invitationData = await this.invitationService.getInvitation(token);
      if (!invitationData) {
        return null;
      }

      // Check if user exists (completed invitation)
      const existingUser = await this.userRepository.findByEmail(
        invitationData.email,
      );
      const isCompleted = !!existingUser;
      const isExpired = invitationData.expiresAt < new Date();

      let status: 'pending' | 'completed' | 'expired';
      if (isCompleted) {
        status = 'completed';
      } else if (isExpired) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      // Get department names
      const departments = await this.departmentRepository.findByIds(
        invitationData.departmentIds,
      );
      const departmentNames = departments.map((dept) => dept.name);

      return {
        token,
        name: invitationData.name,
        email: invitationData.email,
        employeeId: invitationData.employeeId,
        jobTitle: invitationData.jobTitle,
        departmentNames,
        permissions: invitationData.permissions,
        status,
        createdAt: invitationData.createdAt,
        expiresAt: invitationData.expiresAt,
        // completedAt: isCompleted ? existingUser?.createdAt : undefined,
      } as SupervisorInvitationStatus;
    });

    const allInvitations = (await Promise.all(invitationPromises)).filter(
      (invitation) => invitation !== null,
    ) as SupervisorInvitationStatus[];

    // Filter by status if provided
    let filteredInvitations = allInvitations;
    if (request.status) {
      filteredInvitations = allInvitations.filter(
        (invitation) => invitation.status === request.status,
      );
    }

    // Sort by creation date (newest first)
    filteredInvitations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    // Apply pagination
    const total = filteredInvitations.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedInvitations = filteredInvitations.slice(
      offset,
      offset + limit,
    );

    return {
      invitations: paginatedInvitations,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
