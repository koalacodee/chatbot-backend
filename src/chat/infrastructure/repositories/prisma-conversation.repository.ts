import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { Conversation } from '../../domain/entities/conversation.entity';

@Injectable()
export class PrismaConversationRepository extends ConversationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(conversation: any): Conversation {
    return Conversation.create({
      id: conversation.id,
      userId: conversation.userId,
      startedAt: conversation.startedAt,
      updatedAt: conversation.updatedAt,
      endedAt: conversation.endedAt,
    });
  }

  async save(conversation: Conversation): Promise<Conversation> {
    const data = {
      id: conversation.id.value,
      userId: conversation.userId.value,
      startedAt: conversation.startedAt,
      updatedAt: conversation.updatedAt,
      endedAt: conversation.endedAt,
    };
    const upserted = await this.prisma.conversation.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });
    return conversation ? this.toDomain(conversation) : null;
  }

  async findAll(): Promise<Conversation[]> {
    const conversations = await this.prisma.conversation.findMany();
    return conversations.map(this.toDomain);
  }

  async removeById(id: string): Promise<Conversation | null> {
    const conversation = await this.findById(id);
    if (!conversation) return null;
    await this.prisma.conversation.delete({ where: { id } });
    return conversation;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.conversation.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.conversation.count();
  }
}
