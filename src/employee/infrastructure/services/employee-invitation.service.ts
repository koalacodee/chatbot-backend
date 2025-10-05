import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';
import { randomBytes } from 'crypto';

export enum InvitationStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface EmployeeInvitationData {
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  supervisorId: string;
  subDepartmentIds: string[];
  permissions: EmployeePermissionsEnum[];
  status: InvitationStatus;
  requestedBy: string; // User ID of the requester
  approvedBy?: string; // User ID of the approver
  approvedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class EmployeeInvitationService {
  private readonly INVITATION_PREFIX = 'employee_invitation:';
  private readonly INVITATION_INDEX_KEY = 'employee_invitations_index';
  private readonly INVITATION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(private readonly redisService: RedisService) {}

  async createInvitation(
    data: Omit<EmployeeInvitationData, 'createdAt' | 'expiresAt'>,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const invitationData: EmployeeInvitationData = {
      ...data,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.INVITATION_EXPIRY_SECONDS * 1000),
    };

    const key = this.getInvitationKey(token);
    await this.redisService.set(
      key,
      JSON.stringify(invitationData),
      this.INVITATION_EXPIRY_SECONDS,
    );

    // Add token to index for easy listing
    await this.redisService.execCommand(
      'sadd',
      this.INVITATION_INDEX_KEY,
      token,
    );

    return token;
  }

  async getInvitation(token: string): Promise<EmployeeInvitationData | null> {
    const key = this.getInvitationKey(token);
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    try {
      const invitationData = JSON.parse(data) as EmployeeInvitationData;
      // Convert date strings back to Date objects
      invitationData.createdAt = new Date(invitationData.createdAt);
      invitationData.expiresAt = new Date(invitationData.expiresAt);

      // Check if invitation has expired
      if (invitationData.expiresAt < new Date()) {
        await this.deleteInvitation(token);
        return null;
      }

      return invitationData;
    } catch (error) {
      return null;
    }
  }

  async deleteInvitation(token: string): Promise<void> {
    const key = this.getInvitationKey(token);
    await this.redisService.del(key);

    // Remove token from index
    await this.redisService.execCommand(
      'srem',
      this.INVITATION_INDEX_KEY,
      token,
    );
  }

  async isInvitationValid(token: string): Promise<boolean> {
    const invitation = await this.getInvitation(token);
    return invitation !== null;
  }

  async getAllInvitationTokens(): Promise<string[]> {
    const tokens = await this.redisService.execCommand(
      'smembers',
      this.INVITATION_INDEX_KEY,
    );
    return Array.isArray(tokens) ? tokens : [];
  }

  async cleanupExpiredInvitations(): Promise<number> {
    const tokens = await this.getAllInvitationTokens();
    let cleanedCount = 0;

    for (const token of tokens) {
      const invitation = await this.getInvitation(token);
      if (!invitation) {
        // Token exists in index but not in Redis, remove from index
        await this.redisService.execCommand(
          'srem',
          this.INVITATION_INDEX_KEY,
          token,
        );
        cleanedCount++;
      } else if (invitation.expiresAt < new Date()) {
        // Invitation has expired, clean it up
        await this.deleteInvitation(token);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async approveInvitation(token: string, approvedBy: string): Promise<void> {
    const invitationData = await this.getInvitation(token);
    if (!invitationData) {
      throw new Error('Invitation not found');
    }

    invitationData.status = InvitationStatus.APPROVED;
    invitationData.approvedBy = approvedBy;
    invitationData.approvedAt = new Date();

    const key = this.getInvitationKey(token);
    await this.redisService.set(
      key,
      JSON.stringify(invitationData),
      this.INVITATION_EXPIRY_SECONDS,
    );
  }

  async rejectInvitation(token: string, rejectedBy: string): Promise<void> {
    const invitationData = await this.getInvitation(token);
    if (!invitationData) {
      throw new Error('Invitation not found');
    }

    invitationData.status = InvitationStatus.REJECTED;
    invitationData.approvedBy = rejectedBy;
    invitationData.approvedAt = new Date();

    const key = this.getInvitationKey(token);
    await this.redisService.set(
      key,
      JSON.stringify(invitationData),
      this.INVITATION_EXPIRY_SECONDS,
    );
  }

  async getAllInvitationsByStatus(
    status?: InvitationStatus,
  ): Promise<{ token: string; data: EmployeeInvitationData }[]> {
    const tokens = await this.getAllInvitationTokens();
    const invitations: { token: string; data: EmployeeInvitationData }[] = [];

    for (const token of tokens) {
      const invitation = await this.getInvitation(token);
      if (invitation && (!status || invitation.status === status)) {
        invitations.push({ token, data: invitation });
      }
    }

    return invitations;
  }

  async getInvitationsByRequestedBy(
    requestedBy: string,
    status?: InvitationStatus,
  ): Promise<{ token: string; data: EmployeeInvitationData }[]> {
    const tokens = await this.getAllInvitationTokens();
    const invitations: { token: string; data: EmployeeInvitationData }[] = [];

    for (const token of tokens) {
      const invitation = await this.getInvitation(token);
      if (
        invitation &&
        invitation.requestedBy === requestedBy &&
        (!status || invitation.status === status)
      ) {
        invitations.push({ token, data: invitation });
      }
    }

    return invitations;
  }

  private getInvitationKey(token: string): string {
    return `${this.INVITATION_PREFIX}${token}`;
  }
}
