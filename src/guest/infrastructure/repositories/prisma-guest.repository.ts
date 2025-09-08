import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { GuestRepository } from '../../domain/repositories/guest.repository';
import { Guest } from '../../domain/entities/guest.entity';

@Injectable()
export class PrismaGuestRepository extends GuestRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(row: any): Guest {
    return Guest.fromJSON(row);
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

    const upsert = await this.prisma.guest.upsert({
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
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Guest | null> {
    const row = await this.prisma.guest.findUnique({
      where: { id },
      include: {
        conversations: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<Guest | null> {
    const row = await this.prisma.guest.findUnique({
      where: { email },
      include: {
        conversations: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByPhone(phone: string): Promise<Guest | null> {
    const row = await this.prisma.guest.findFirst({
      where: { phone },
      include: {
        conversations: true,
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

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.prisma.guest.count({ where: { phone } });
    return count > 0;
  }
}
