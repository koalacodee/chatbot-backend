import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { Conversation } from '../../domain/entities/conversation.entity';
import { Message } from 'src/chat/domain/entities/message.entity';

@Injectable()
export class PrismaConversationRepository extends ConversationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(conversation: any): Conversation {
    return Conversation.create({
      id: conversation.id,
      userId: conversation.userId,
      guestId: conversation.guestId,
      startedAt: conversation.startedAt,
      updatedAt: conversation.updatedAt,
      endedAt: conversation.endedAt,
      messages: conversation.messages
        ? conversation.messages.map((m) =>
            Message.create({
              id: m.id,
              conversationId: m.conversationId,
              content: m.content,
              createdAt: m.createdAt,
              updatedAt: m.updatedAt,
              role: m.role,
            }),
          )
        : undefined,
    });
  }

  async save(conversation: Conversation): Promise<Conversation> {
    const data = {
      id: conversation.id.value,
      startedAt: conversation.startedAt,
      updatedAt: conversation.updatedAt,
      endedAt: conversation.endedAt,
      user: conversation.userId
        ? { connect: { id: conversation.userId.toString() } }
        : undefined,
      guestId: conversation.guestId
        ? conversation.guestId.toString()
        : undefined,
    };
    const upserted = await this.prisma.conversation.upsert({
      where: { id: data.id },
      update: data,
      create: data,
      include: { messages: { orderBy: { createdAt: 'desc' } } },
    });
    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
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

  async findByGuestOrUser(
    userId?: string,
    guestId?: string,
  ): Promise<Conversation[] | null> {
    const conversation = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userId: userId }, { guestId: guestId }],
      },
      include: { messages: { orderBy: { createdAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    console.dir(conversation);
    return conversation ? conversation.map(this.toDomain) : null;
  }
}
