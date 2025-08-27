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
@Injectable()
export class PrismaSupportTicketRepository extends SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(rec: any): Promise<SupportTicket> {
    console.log(rec);

    return SupportTicket.fromPersistence({
      id: rec.id,
      guestId: rec.guestId,
      subject: rec.subject,
      description: rec.description,
      departmentId: rec.departmentId,
      assignee: rec.assignee
        ? await Employee.create({
            ...rec.assignee,
            user: await User.create(rec.assignee.user),
          })
        : undefined,
      status: SupportTicketStatus[rec.status],
      guest: rec.guest ? await Guest.create(rec.guest) : undefined,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      code: rec.code,
    });
  }

  async save(ticket: SupportTicket): Promise<SupportTicket> {
    const data = {
      id: ticket.id.toString(),
      guestId: ticket.guestId.toString(),
      subject: ticket.subject,
      description: ticket.description,
      departmentId: ticket.departmentId.toString(),
      assigneeId: ticket.assignee ? ticket.assignee.id.toString() : undefined,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      code: ticket.code.toString(),
    };

    const upsert = await this.prisma.supportTicket.upsert({
      where: { id: data.id },
      update: {
        guestId: data.guestId,
        subject: data.subject,
        description: data.description,
        departmentId: data.departmentId,
        assigneeId: data.assigneeId?.toString(),
        status: data.status,
        updatedAt: new Date(),
      },
      create: data,
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<SupportTicket | null> {
    const rec = await this.prisma.supportTicket.findUnique({ where: { id } });
    return rec ? this.toDomain(rec) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { assignee: { include: { user: true } }, guest: true },
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

  async findByGuestId(guestId: string): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { guestId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { departmentId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
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
          { guestId: query },
          { assigneeId: query },
          { guest: { name: { contains: query, mode: 'insensitive' } } },
          { guest: { phone: { contains: query, mode: 'insensitive' } } },
          {
            assignee: {
              user: { name: { contains: query, mode: 'insensitive' } },
            },
          },
          { department: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
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
    const rec = await this.prisma.supportTicket.findUnique({ where: { code } });
    return rec ? this.toDomain(rec) : null;
  }
}
