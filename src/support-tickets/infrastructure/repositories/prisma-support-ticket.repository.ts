import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  FrequentTicketSubject,
  SupportTicketRepository,
} from '../../domain/repositories/support-ticket.repository';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../domain/entities/support-ticket.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { User } from 'src/shared/entities/user.entity';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { SupportTicketInteraction } from 'src/support-tickets/domain/entities/support-ticket-interaction.entity';
import { SupportTicketStatus as PrismaSupportTicketStatus } from '@prisma/client';
@Injectable()
export class PrismaSupportTicketRepository extends SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(rec: any): Promise<SupportTicket> {
    return SupportTicket.fromPersistence({
      id: rec.id,
      subject: rec.subject,
      description: rec.description,
      departmentId: rec.departmentId,
      department: rec.department
        ? Department.create(rec.department)
        : undefined,
      assignee: rec.assignee
        ? await Employee.create({
            ...rec.assignee,
            user: await User.create(rec.assignee.user),
          })
        : undefined,
      status: SupportTicketStatus[rec.status],
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      code: rec.code,
      interaction: rec.interaction
        ? SupportTicketInteraction.create(rec.interaction)
        : undefined,
      guestName: rec.guestName,
      guestPhone: rec.guestPhone,
      guestEmail: rec.guestEmail,
    });
  }

  async save(ticket: SupportTicket): Promise<SupportTicket> {
    const data = {
      id: ticket.id.toString(),
      subject: ticket.subject,
      description: ticket.description,
      // departmentId: ,
      department: { connect: { id: ticket.departmentId.toString() } },
      assignee: ticket.assignee
        ? { connect: { id: ticket.assignee.id.toString() } }
        : undefined,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      code: ticket.code.toString(),
      guestName: ticket.toJSON().guestName,
      guestPhone: ticket.toJSON().guestPhone,
      guestEmail: ticket.toJSON().guestEmail,
    };

    const upsert = await this.prisma.supportTicket.upsert({
      where: { id: data.id },
      update: {
        subject: data.subject,
        description: data.description,
        status: PrismaSupportTicketStatus[data.status],
        updatedAt: new Date(),
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
      },
      create: data,
      include: {
        assignee: { include: { user: true } },
        department: true,
        interaction: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<SupportTicket | null> {
    const rec = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        assignee: { include: { user: true } },
        department: true,
        interaction: true,
      },
    });
    return rec ? this.toDomain(rec) : null;
  }

  async findAll(
    offset?: number,
    limit?: number,
    departmentIds?: string[],
  ): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: departmentIds ? { departmentId: { in: departmentIds } } : {},
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { include: { user: true } },
        department: true,
        interaction: true,
      },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<SupportTicket | null> {
    const rec = await this.findById(id);
    if (!rec) return null;
    await this.prisma.supportTicket.delete({ where: { id } });
    return rec;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.supportTicket.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.supportTicket.count();
  }

  async countOpenTickets(): Promise<number> {
    return this.prisma.supportTicket.count({ where: { status: 'NEW' } });
  }

  async countAnsweredPendingClosure(): Promise<number> {
    return this.prisma.supportTicket.count({ where: { status: 'ANSWERED' } });
  }

  async findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { departmentId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { include: { user: true } },

        department: true,
        interaction: true,
      },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async search(query: string): Promise<SupportTicket[]> {
    const filteredTickets = await this.prisma.supportTicket.findMany({
      where: {
        OR: [
          { id: query },
          { subject: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { assigneeId: query },
          { guestName: { contains: query, mode: 'insensitive' } },
          { guestPhone: { contains: query, mode: 'insensitive' } },
          {
            assignee: {
              user: { name: { contains: query, mode: 'insensitive' } },
            },
          },
          { department: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { include: { user: true } },
        department: true,
        interaction: true,
      },
    });
    return Promise.all(filteredTickets.map((r) => this.toDomain(r)));
  }

  async getFrequentTicketSubjects(
    limit: number = 5,
  ): Promise<FrequentTicketSubject[]> {
    return this.prisma.$queryRaw<FrequentTicketSubject[]>`
      WITH TicketSubjects AS (
        SELECT 
          LOWER(TRIM(st.subject)) AS subject_lower,
          TRIM(st.subject) AS subject_original,
          st.category_id,
          COUNT(*) AS count
        FROM support_tickets st
        WHERE st.subject IS NOT NULL 
          AND TRIM(st.subject) <> ''
          AND LOWER(TRIM(st.subject)) NOT IN (
            SELECT LOWER(TRIM(q.question))
            FROM questions q
          )
        GROUP BY LOWER(TRIM(st.subject)), TRIM(st.subject), st.category_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        ts.subject_original,
        ts.count,
        ts.category_id,
        COALESCE(c.name, 'Unknown') AS category_name
      FROM TicketSubjects ts
      LEFT JOIN categories c ON c.id = ts.category_id
      ORDER BY ts.count DESC
      LIMIT ${limit};
    `;
  }

  async findByCode(code: string): Promise<SupportTicket | null> {
    const rec = await this.prisma.supportTicket.findUnique({
      where: { code },
      include: {
        assignee: { include: { user: true } },
        department: true,
        interaction: true,
      },
    });
    return rec ? this.toDomain(rec) : null;
  }

  async findByPhoneNumber(
    phone: string,
    offset: number = 0,
    limit: number = 10,
  ): Promise<
    {
      id: string;
      subject: string;
      description: string;
      answer?: string;
      isRated: boolean;
      departmentId: string;
      createdAt: Date;
      updatedAt: Date;
      status: SupportTicketStatus;
    }[]
  > {
    return this.prisma.$queryRaw`
      WITH PhoneTickets AS (
        SELECT 
          st.id,
          st.subject,
          st.description,
          st.department_id as "departmentId",
          st.created_at as "createdAt",
          st.updated_at as "updatedAt",
          st.guest_phone,
          st.status,
          st.code
        FROM support_tickets st
        WHERE st.guest_phone = ${phone}
      ),
      TicketAnswers AS (
        SELECT 
          sta.support_ticket_id,
          sta.content as answer
        FROM support_ticket_answers sta
      ),
      TicketRatings AS (
        SELECT 
          sti.support_ticket_id,
          CASE 
            WHEN sti.id IS NOT NULL THEN true 
            ELSE false 
          END as "isRated"
        FROM support_ticket_interactions sti
      )
      SELECT 
        pt.id,
        pt.subject,
        pt.description,
        ta.answer,
        COALESCE(tr."isRated", false) as "isRated",
        pt."departmentId",
        pt."createdAt",
        pt."updatedAt",
        UPPER(pt.status::text) AS status,
        pt.code
      FROM PhoneTickets pt
      LEFT JOIN TicketAnswers ta ON ta.support_ticket_id = pt.id
      LEFT JOIN TicketRatings tr ON tr.support_ticket_id = pt.id
      ORDER BY pt."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
  }
}
