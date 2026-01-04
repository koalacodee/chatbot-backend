import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface TrackTicketInputDto {
  code: string;
  guestId: string;
}

export interface TrackTicketOutput {
  ticket: SupportTicket;
  answers: SupportTicketAnswer[];
  fileHubAttachments: FilehubAttachmentMessage[];
  isRated: boolean;
}

@Injectable()
export class TrackTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(dto: TrackTicketInputDto): Promise<TrackTicketOutput> {
    const result = await this.supportTicketRepo.findByCode(dto.code);

    if (!result) throw new NotFoundException({ code: 'ticket_not_found' });
    if (!result.ticket)
      throw new NotFoundException({ code: 'ticket_not_found' });
    console.log(result);

    const signedUrls =
      result.fileHubAttachments.length > 0
        ? await this.fileHubService.getSignedUrlBatch(
            result.fileHubAttachments.map((a) => a.filename),
          )
        : [];

    return {
      ticket: result.ticket,
      fileHubAttachments: result.fileHubAttachments.map((a) => ({
        ...a.toJSON(),
        signedUrl: signedUrls.find((s) => s.filename === a.filename)?.signedUrl,
      })),
      answers: result.answers,
      isRated: result.isRated,
    };
  }
}
