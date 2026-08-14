import { NotFoundException } from '@nestjs/common';
import { Attachment } from '../domain/entities/attachment.entity';
import { AttachmentRepository } from '../domain/repositories/attachment.repository';

type AttachmentUpdate = Parameters<AttachmentRepository['update']>[1];

/**
 * In-memory implementation of the real contract.
 *
 * `cloned` rows are excluded from the user/global listings here exactly as they are in
 * the Drizzle repository — that filter is a business rule, not a query detail, so a fake
 * that ignored it would let tests pass against behaviour production does not have.
 */
export class FakeAttachmentRepository extends AttachmentRepository {
  readonly attachments = new Map<string, Attachment>();

  seed(...attachments: Attachment[]): this {
    for (const attachment of attachments) {
      this.attachments.set(attachment.id, attachment);
    }
    return this;
  }

  private all(): Attachment[] {
    return [...this.attachments.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  private originals(): Attachment[] {
    return this.all().filter((attachment) => !attachment.cloned);
  }

  async save(attachment: Attachment): Promise<Attachment> {
    this.attachments.set(attachment.id, attachment);
    return attachment;
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.attachments.get(id) ?? null;
  }

  /**
   * Mirrors `WHERE id IN (...)`: a set match, so a repeated id yields one row, not two,
   * and unknown ids are simply absent.
   *
   * This distinction is load-bearing. CreateAttachmentGroupUseCase decides whether every
   * requested attachment exists by comparing `results.length` against `ids.length`, so a
   * fake that returned one row per requested id would make duplicate ids look valid here
   * while the real repository rejects them.
   */
  async findByIds(ids: string[]): Promise<Attachment[]> {
    return [...new Set(ids)]
      .map((id) => this.attachments.get(id))
      .filter((attachment): attachment is Attachment => attachment !== undefined);
  }

  async exists(id: string): Promise<boolean> {
    return this.attachments.has(id);
  }

  async findByTargetId(targetId: string): Promise<Attachment[]> {
    return this.all().filter((attachment) => attachment.targetId === targetId);
  }

  async countByTargetId(targetId: string): Promise<number> {
    return (await this.findByTargetId(targetId)).length;
  }

  async removeByTargetId(targetId: string): Promise<Attachment[]> {
    const removed = await this.findByTargetId(targetId);
    for (const attachment of removed) this.attachments.delete(attachment.id);
    return removed;
  }

  async removeById(id: string): Promise<Attachment | null> {
    const existing = this.attachments.get(id) ?? null;
    this.attachments.delete(id);
    return existing;
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Attachment[]> {
    return this.originals()
      .filter((attachment) => attachment.userId === userId)
      .slice(offset, offset + limit);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.originals().filter(
      (attachment) => attachment.userId === userId,
    ).length;
  }

  async findGlobalAttachments(limit = 50, offset = 0): Promise<Attachment[]> {
    return this.originals()
      .filter((attachment) => attachment.isGlobal)
      .slice(offset, offset + limit);
  }

  async countGlobalAttachments(): Promise<number> {
    return this.originals().filter((attachment) => attachment.isGlobal).length;
  }

  async findUserAndGlobalAttachments(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Attachment[]> {
    return this.originals()
      .filter(
        (attachment) => attachment.userId === userId || attachment.isGlobal,
      )
      .slice(offset, offset + limit);
  }

  async countUserAndGlobalAttachments(userId: string): Promise<number> {
    return this.originals().filter(
      (attachment) => attachment.userId === userId || attachment.isGlobal,
    ).length;
  }

  async update(id: string, update: AttachmentUpdate): Promise<Attachment> {
    const existing = this.attachments.get(id);
    if (!existing) throw new NotFoundException('Attachment not found');

    const replacement = Attachment.create({
      id: existing.id,
      type: update.type ?? existing.type,
      filename: update.filename ?? existing.filename,
      originalName: update.originalName ?? existing.originalName,
      expirationDate:
        update.expirationDate === undefined
          ? (existing.expirationDate ?? undefined)
          : (update.expirationDate ?? undefined),
      targetId: (update.targetId ?? existing.targetId) ?? undefined,
      userId: (update as any).userId ?? existing.userId ?? undefined,
      guestId: (update as any).guestId ?? existing.guestId ?? undefined,
      isGlobal: (update as any).isGlobal ?? existing.isGlobal,
      size: existing.size,
      cloned: existing.cloned,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.attachments.set(id, replacement);

    return replacement;
  }
}
