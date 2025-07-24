import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MessageRepository } from '../../domain/repositories/message.repository';
import { Message } from '../../domain/entities/message.entity';

@Injectable()
export class PrismaMessageRepository extends MessageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(message: any): Message {
    return Message.create({
      id: message.id,
      content: message.content,
      role: message.role,
      conversationId: message.conversationId,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }

  async save(message: Message): Promise<Message> {
    const data = {
      id: message.id.value,
      content: message.content,
      role: message.role,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
    const upsert = await this.prisma.message.upsert({
      where: { id: data.id },
      update: {
        ...data,
        conversation: { connect: { id: message.conversationId.toString() } },
      },
      create: {
        ...data,
        conversation: { connect: { id: message.conversationId.toString() } },
      },
    });
    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Message | null> {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });
    return message ? this.toDomain(message) : null;
  }

  async findAll(): Promise<Message[]> {
    const messages = await this.prisma.message.findMany();
    return messages.map(this.toDomain);
  }

  async removeById(id: string): Promise<Message | null> {
    const message = await this.findById(id);
    if (!message) return null;
    await this.prisma.message.delete({ where: { id } });
    return message;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.message.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.message.count();
  }
}
