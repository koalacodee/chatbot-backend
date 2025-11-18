import { Injectable, NotFoundException } from '@nestjs/common';
import { SupervisorInvitationService } from '../../infrastructure/services/supervisor-invitation.service';

export interface DeleteSupervisorInvitationRequest {
  token: string;
}

@Injectable()
export class DeleteSupervisorInvitationUseCase {
  constructor(
    private readonly invitationService: SupervisorInvitationService,
  ) { }

  async execute(request: DeleteSupervisorInvitationRequest): Promise<void> {
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

    // Delete the invitation
    await this.invitationService.deleteInvitation(request.token);
  }
}

