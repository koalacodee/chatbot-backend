import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { GuestRepository } from '../../domain/repositories/guest.repository';
import { Guest } from '../../domain/entities/guest.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { RefreshToken } from 'src/auth/domain/entities/refresh-token.entity';
import { Conversation } from 'src/chat/domain/entities/conversation.entity';
import { Interaction } from 'src/shared/entities/interactions.entity';
import { SupportTicket } from 'src/support-tickets/domain/entities/support-ticket.entity';

@Injectable()
export class PrismaGuestRepository extends GuestRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(row: any): Guest {
    return Guest.create({
      id: row.id,
      name: row.name,
      email: Email.create(row.email),
      phone: row.phone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tokens: row.refreshTokens.map((token) => new RefreshToken(token)),
      conversations: row.conversations.map((conversation) =>
        Conversation.create(conversation),
      ),
      interactions: row.interactions.map(
        (interaction) => new Interaction(interaction),
      ),
      supportTickets: row.supportTickets.map((ticket) =>
        SupportTicket.create(ticket),
      ),
    });
  }

  async save(guest: Guest): Promise<Guest> {
    const data = {
      id: guest.id.toString(),
      name: guest.name,
      email: guest.email.getValue(),
      phone: guest.phone,
      createdAt: guest.createdAt,
      updatedAt: new Date(),
    };

    const upserted = await this.prisma.guest.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        updatedAt: data.updatedAt,
      },
      create: data,
      include: {
        conversations: true,
        refreshTokens: true,
        interactions: true,
        supportTickets: true,
      },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Guest | null> {
    const row = await this.prisma.guest.findUnique({
      where: { id },
      include: {
        conversations: true,
        refreshTokens: true,
        interactions: true,
        supportTickets: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<Guest | null> {
    const row = await this.prisma.guest.findUnique({
      where: { email },
      include: {
        conversations: true,
        refreshTokens: true,
        interactions: true,
        supportTickets: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByPhone(phone: string): Promise<Guest | null> {
    const row = await this.prisma.guest.findFirst({
      where: { phone },
      include: {
        conversations: true,
        refreshTokens: true,
        interactions: true,
        supportTickets: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Guest[]> {
    const rows = await this.prisma.guest.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        conversations: true,
        refreshTokens: true,
        interactions: true,
        supportTickets: true,
      },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async removeById(id: string): Promise<Guest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.guest.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.guest.count({ where: { id } });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.guest.count({ where: { email } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.guest.count();
  }
}
