import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Injectable()
export class PrismaSupportTicketRepository extends SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(rec: any): SupportTicket {
    return SupportTicket.fromPersistence({
      id: UUID.create(rec.id),
      guestId: UUID.create(rec.guestId),
      subject: rec.subject,
      description: rec.description,
      departmentId: UUID.create(rec.departmentId),
      status: rec.status,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    });
  }

  async save(ticket: SupportTicket): Promise<SupportTicket> {
    const data = {
      id: ticket.id.toString(),
      guestId: ticket.guestId.toString(),
      subject: ticket.subject,
      description: ticket.description,
      departmentId: ticket.departmentId.toString(),
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    } as const;

    const upserted = await this.prisma.supportTicket.upsert({
      where: { id: data.id },
      update: {
        guestId: data.guestId,
        subject: data.subject,
        description: data.description,
        departmentId: data.departmentId,
        status: data.status,
        updatedAt: new Date(),
      },
      create: data,
    });

    return this.toDomain(upserted);
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
    });
    return rows.map((r) => this.toDomain(r));
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

  async findByGuestId(guestId: string): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { guestId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByDepartment(
    departmentId: string,
    status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED',
  ): Promise<SupportTicket[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { departmentId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }
}
