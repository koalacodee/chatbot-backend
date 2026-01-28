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
import {
  CursorInput,
  CursorMeta,
} from 'src/common/drizzle/helpers/cursor';

export interface GetAllSupportTicketsUseCaseInput {
  cursor?: CursorInput;
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
  ) { }

  async execute({
    cursor,
    userId,
    userRole,
    status,
    departmentId,
    search,
  }: GetAllSupportTicketsUseCaseInput): Promise<{
    tickets: Array<ReturnType<SupportTicket['toJSON']>>;
    metrics: SupportTicketMetrics;
    attachments: FilehubAttachmentMessage[];
    meta: CursorMeta;
  }> {
    let result: { data: GetAllTicketsAndMetricsOutput; meta: CursorMeta };
    console.log(userRole);

    switch (userRole) {
      case Roles.ADMIN:
        result = await this.supportTicketRepo.getAllTicketsAndMetricsForAdmin({
          cursor,
          status,
          departmentIds: departmentId ? [departmentId] : undefined,
          search,
        });
        break;
      case Roles.SUPERVISOR:
        result =
          await this.supportTicketRepo.getAllTicketsAndMetricsForSupervisor({
            cursor,
            supervisorUserId: userId,
            status,
            departmentIds: departmentId ? [departmentId] : undefined,
            search,
          });
        break;
      case Roles.EMPLOYEE:
        result =
          await this.supportTicketRepo.getAllTicketsAndMetricsForEmployee({
            cursor,
            employeeUserId: userId,
            status,
            departmentIds: departmentId ? [departmentId] : undefined,
            search,
          });
        break;
      default:
        throw new Error(`Unauthorized role: ${userRole}`);
    }

    const { data, meta } = result;

    if (data.attachments.length > 0) {
      const signedUrls = await this.fileHubService.getSignedUrlBatch(
        data.attachments.map((a) => a.filename),
      );

      const fileHubAttachments = data.attachments.map((a) => {
        const signedUrl = signedUrls.find((s) => s.filename === a.filename);
        return {
          ...a.toJSON(),
          signedUrl: signedUrl?.signedUrl,
        };
      });

      return {
        tickets: data.tickets.map((t) => t.toJSON()),
        metrics: data.metrics,
        attachments: fileHubAttachments,
        meta,
      };
    } else {
      return {
        tickets: data.tickets.map((t) => t.toJSON()),
        metrics: data.metrics,
        attachments: [],
        meta,
      };
    }
  }
}
