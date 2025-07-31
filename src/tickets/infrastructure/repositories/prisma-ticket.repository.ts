import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TicketRepository } from '../../domain/repositories/ticket.repository';
import { Ticket } from '../../domain/entities/ticket.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class PrismaTicketRepository extends TicketRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(ticket: any): Promise<Ticket> {
    return Ticket.create({
      id: ticket.id,
      user: ticket.user ? await User.create(ticket.user, false) : undefined,
      guestId: ticket.guestId,
      question: ticket.question,
      department: Department.create(ticket.department),
      ticketCode: ticket.ticketCode,
      pointId: ticket.pointId,
    });
  }

  async save(ticket: Ticket): Promise<Ticket> {
    const data = {
      id: ticket.id.toString(),
      userId: ticket.user?.id.toString(),
      guestId: ticket.guestId?.toString(),
      question: ticket.question,
      departmentId: ticket.department.id.toString(),
      pointId: ticket.pointId,
      ticketCode: ticket.ticketCode.value,
      status: TicketStatus[ticket.status.value],
    };

    const upserted = await this.prisma.ticket.upsert({
      where: { id: data.id },
      update: data,
      create: data,
      include: {
        user: true,
        department: true,
      },
    });

    return await this.toDomain(upserted);
  }

  async saveMany(tickets: Ticket[]): Promise<Ticket[]> {
    const data = tickets.map((ticket) => ({
      id: ticket.id.toString(),
      userId: ticket.user?.id.toString(),
      guestId: ticket.guestId?.toString(),
      question: ticket.question,
      departmentId: ticket.department.id.toString(),
      pointId: ticket.pointId,
      ticketCode: ticket.ticketCode.value,
    }));

    // Use transaction to ensure all operations succeed or fail together
    const result = await this.prisma.$transaction(async (tx) => {
      const upsertedTickets = [];
      for (const ticketData of data) {
        const upserted = await (tx as any).ticket.upsert({
          where: { id: ticketData.id },
          update: ticketData,
          create: ticketData,
          include: {
            user: true,
            department: true,
          },
        });
        upsertedTickets.push(upserted);
      }
      return upsertedTickets;
    });

    return Promise.all(result.map((ticket) => this.toDomain(ticket)));
  }

  async findById(id: string): Promise<Ticket | null> {
    const ticket = await (this.prisma as any).ticket.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
      },
    });

    return ticket ? await this.toDomain(ticket) : null;
  }

  async findByIds(ids: string[]): Promise<Ticket[]> {
    const tickets = await (this.prisma as any).ticket.findMany({
      where: { id: { in: ids } },
      include: {
        user: true,
        department: true,
      },
    });

    return Promise.all(tickets.map((ticket) => this.toDomain(ticket)));
  }

  async removeById(id: string): Promise<Ticket | null> {
    const ticket = await this.findById(id);
    if (!ticket) return null;

    await (this.prisma as any).ticket.delete({ where: { id } });
    return ticket;
  }

  async removeByIds(ids: string[]): Promise<Ticket[]> {
    const tickets = await this.findByIds(ids);
    if (tickets.length === 0) return [];

    await (this.prisma as any).ticket.deleteMany({
      where: { id: { in: ids } },
    });

    return tickets;
  }

  async count(): Promise<number> {
    return (this.prisma as any).ticket.count();
  }

  async exists(id: string): Promise<boolean> {
    const count = await (this.prisma as any).ticket.count({ where: { id } });
    return count > 0;
  }

  async findAll(offset?: number, limit?: number): Promise<Ticket[]> {
    const tickets = await (this.prisma as any).ticket.findMany({
      skip: offset,
      take: limit,
      include: {
        user: true,
        department: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(tickets.map((ticket) => this.toDomain(ticket)));
  }

  async findPendingTickets(): Promise<Ticket[]> {
    const tickets = await (this.prisma as any).ticket.findMany({
      include: {
        user: true,
        department: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(tickets.map((ticket: any) => this.toDomain(ticket)));
  }

  async findByPointIds(pointIds: string[]): Promise<Ticket[]> {
    const tickets = await (this.prisma as any).ticket.findMany({
      where: { pointId: { in: pointIds } },
      include: {
        user: true,
        department: true,
      },
    });

    return Promise.all(tickets.map((ticket: any) => this.toDomain(ticket)));
  }
}
