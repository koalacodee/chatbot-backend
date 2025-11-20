import { Injectable } from '@nestjs/common';
import { ExportService } from 'src/export/domain/services/export.service';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { InteractionType } from '../../domain/entities/support-ticket-interaction.entity';
import { Export } from 'src/export/domain/entities/export.entity';

interface ExportSupportTicketsInput {
  batchSize?: number;
  departmentIds?: string[];
  start?: Date | string;
  end?: Date | string;
}

@Injectable()
export class ExportSupportTicketsUseCase {
  constructor(
    private readonly exportService: ExportService,
    private readonly ticketRepo: SupportTicketRepository,
    private readonly answerRepo: SupportTicketAnswerRepository,
  ) { }

  private formatDateHuman(d: Date | string | undefined | null): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    } as any).format(date as Date);
  }

  async execute({
    batchSize = 500,
    departmentIds,
    start,
    end,
  }: ExportSupportTicketsInput = {}): Promise<Export> {
    const startDate =
      typeof start === 'string' ? new Date(start) : start ?? undefined;
    const endDate = typeof end === 'string' ? new Date(end) : end ?? undefined;
    const self = this;
    async function* batchGenerator() {
      let offset = 0;
      for (; ;) {
        const tickets = await self.ticketRepo.findAll(
          offset,
          batchSize,
          departmentIds,
          startDate,
          endDate,
          undefined,
          undefined,
        );
        if (!tickets.length) break;

        const ticketIds = tickets.map((t) => t.id.toString());
        const answers = await self.answerRepo.findBySupportTicketIds(ticketIds);

        const rows = tickets.map((t) => {
          const answer = answers.find(
            (a) => a.supportTicket.id.toString() === t.id.toString(),
          );
          const interactionType =
            t.interaction?.type === InteractionType.SATISFACTION
              ? 'satisfied'
              : t.interaction?.type === InteractionType.DISSATISFACTION
                ? 'not_satisfied'
                : '';

          return {
            subject: t.subject,
            description: t.description,
            departmentName: t.department?.name ?? '',
            status: t.status,
            answer: answer?.content ?? '',
            code: t.code,
            interaction: interactionType,
            guestName: (t as any).toJSON().guestName ?? '',
            guestPhone: (t as any).toJSON().guestPhone ?? '',
            guestEmail: (t as any).toJSON().guestEmail ?? '',
            createdAt: self.formatDateHuman(t.createdAt),
            updatedAt: self.formatDateHuman(t.updatedAt),
          };
        });

        yield rows;
        offset += tickets.length;
      }
    }

    return this.exportService.exportFromAsyncGenerator(batchGenerator());
  }
}


