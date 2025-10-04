import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { SupervisorPermissionsEnum } from '../../domain/entities/supervisor.entity';
import { randomBytes, randomUUID } from 'crypto';

export interface SupervisorInvitationData {
  name: string;
  email: string;
  employeeId?: string;
  jobTitle: string;
  departmentIds: string[];
  permissions: SupervisorPermissionsEnum[];
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class SupervisorInvitationService {
  private readonly INVITATION_PREFIX = 'supervisor_invitation:';
  private readonly INVITATION_INDEX_KEY = 'supervisor_invitations_index';
  private readonly INVITATION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(private readonly redisService: RedisService) {}

  async createInvitation(
    data: Omit<SupervisorInvitationData, 'createdAt' | 'expiresAt'>,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const invitationData: SupervisorInvitationData = {
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

  async getInvitation(token: string): Promise<SupervisorInvitationData | null> {
    const key = this.getInvitationKey(token);
    const data = await this.redisService.get(key);

    if (!data) {
      return null;
    }

    try {
      const invitationData = JSON.parse(data) as SupervisorInvitationData;
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

  private getInvitationKey(token: string): string {
    return `${this.INVITATION_PREFIX}${token}`;
  }
}
