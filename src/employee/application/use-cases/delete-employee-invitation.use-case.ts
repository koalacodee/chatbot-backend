import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { EmployeeInvitationService } from '../../infrastructure/services/employee-invitation.service';
import { Roles } from 'src/shared/value-objects/role.vo';

export interface DeleteEmployeeInvitationRequest {
  token: string;
}

@Injectable()
export class DeleteEmployeeInvitationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly invitationService: EmployeeInvitationService,
  ) { }

  async execute(
    request: DeleteEmployeeInvitationRequest,
    requestingUserId: string,
  ): Promise<void> {
    if (!requestingUserId) {
      throw new BadRequestException({
        details: [
          { field: 'requestingUserId', message: 'User ID is required' },
        ],
      });
    }

    const user = await this.userRepository.findById(requestingUserId);
    if (!user) {
      throw new BadRequestException({
        details: [{ field: 'requestingUserId', message: 'User not found' }],
      });
    }

    // Check if invitation exists
    const invitationData = await this.invitationService.getInvitation(
      request.token,
    );
    if (!invitationData) {
      throw new NotFoundException({
        details: [
          { field: 'token', message: 'Invitation not found or already expired' },
        ],
      });
    }

    // Check ownership - only the supervisor who requested the invitation or admin can delete it
    if (invitationData.requestedBy !== requestingUserId && user.role.getRole() !== Roles.ADMIN) {
      throw new ForbiddenException({
        details: [
          {
            field: 'token',
            message: 'You can only delete invitations that you requested',
          },
        ],
      });
    }

    // Delete the invitation
    await this.invitationService.deleteInvitation(request.token);
  }
}

