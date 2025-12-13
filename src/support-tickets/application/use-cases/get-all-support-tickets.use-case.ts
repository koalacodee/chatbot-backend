import { Injectable } from '@nestjs/common';
import {
  SupportTicketRepository,
  SupportTicketMetrics,
  GetAllTicketsAndMetricsOutput,
} from '../../domain/repositories/support-ticket.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../domain/entities/support-ticket.entity';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

export interface GetAllSupportTicketsUseCaseInput {
  offset?: number;
  limit?: number;
  userId: string;
  userRole: string;
  status?: SupportTicketStatus;
  departmentId?: string;
  search?: string;
}

@Injectable()
export class GetAllSupportTicketsUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute({
    offset,
    limit,
    userId,
    userRole,
    status,
    departmentId,
    search,
  }: GetAllSupportTicketsUseCaseInput): Promise<{
    tickets: Array<ReturnType<SupportTicket['toJSON']>>;
    metrics: SupportTicketMetrics;
    attachments: FilehubAttachmentMessage[];
  }> {
    let result: GetAllTicketsAndMetricsOutput;
    console.log(userRole);

    switch (userRole) {
      case Roles.ADMIN:
        result = await this.supportTicketRepo.getAllTicketsAndMetricsForAdmin({
          offset,
          limit,
          status,
          departmentIds: departmentId ? [departmentId] : undefined,
          search,
        });
        break;
      case Roles.SUPERVISOR:
        result =
          await this.supportTicketRepo.getAllTicketsAndMetricsForSupervisor({
            offset,
            limit,
            supervisorUserId: userId,
            status,
            departmentIds: departmentId ? [departmentId] : undefined,
            search,
          });
        break;
      case Roles.EMPLOYEE:
        result =
          await this.supportTicketRepo.getAllTicketsAndMetricsForEmployee({
            offset,
            limit,
            employeeUserId: userId,
            status,
            departmentIds: departmentId ? [departmentId] : undefined,
            search,
          });
        break;
    }

    if (result.attachments.length > 0) {
      const signedUrls = await this.fileHubService.getSignedUrlBatch(
        result.attachments.map((a) => a.filename),
      );

      const fileHubAttachments = result.attachments.map((a) => {
        const signedUrl = signedUrls.find((s) => s.filename === a.filename);
        return {
          ...a.toJSON(),
          signedUrl: signedUrl?.signedUrl,
        };
      });

      return {
        tickets: result.tickets.map((t) => t.toJSON()),
        metrics: result.metrics,
        attachments: fileHubAttachments,
      };
    } else {
      return {
        tickets: result.tickets.map((t) => t.toJSON()),
        metrics: result.metrics,
        attachments: [],
      };
    }
  }
}
