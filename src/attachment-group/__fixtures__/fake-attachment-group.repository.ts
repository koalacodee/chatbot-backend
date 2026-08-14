import { NotFoundException } from '@nestjs/common';
import { AttachmentGroup } from '../domain/entities/attachment-group.entity';
import { AttachmentGroupRepository } from '../domain/repositories/attachment-group.repository';

type GroupUpdate = Parameters<AttachmentGroupRepository['update']>[1];

/**
 * In-memory implementation of the real contract. `update` rebuilds the entity the way the
 * Drizzle repository does — writing columns and reading back — rather than mutating the
 * stored instance, so a test cannot pass by accidentally sharing an object reference.
 */
export class FakeAttachmentGroupRepository extends AttachmentGroupRepository {
  readonly groups = new Map<string, AttachmentGroup>();

  /** Every update applied, in order — lets a test assert what was persisted. */
  readonly updates: Array<{ id: string; update: GroupUpdate }> = [];

  seed(...groups: AttachmentGroup[]): this {
    for (const group of groups) this.groups.set(group.id, group);
    return this;
  }

  async save(attachmentGroup: AttachmentGroup): Promise<AttachmentGroup> {
    this.groups.set(attachmentGroup.id, attachmentGroup);
    return attachmentGroup;
  }

  async findById(id: string): Promise<AttachmentGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async findByKey(key: string): Promise<AttachmentGroup | null> {
    return (
      [...this.groups.values()].find((group) => group.key === key) ?? null
    );
  }

  async findByCreatedById(
    createdById: string,
    limit = 50,
    offset = 0,
  ): Promise<AttachmentGroup[]> {
    const mine = [...this.groups.values()].filter(
      (group) => group.createdById === createdById,
    );

    return mine.slice(offset, offset + limit);
  }

  async countByCreatedById(createdById: string): Promise<number> {
    return [...this.groups.values()].filter(
      (group) => group.createdById === createdById,
    ).length;
  }

  async removeById(id: string): Promise<AttachmentGroup | null> {
    const existing = this.groups.get(id) ?? null;
    this.groups.delete(id);
    return existing;
  }

  async update(id: string, update: GroupUpdate): Promise<AttachmentGroup> {
    const existing = this.groups.get(id);
    if (!existing) throw new NotFoundException('Attachment group not found');

    this.updates.push({ id, update });

    const replacement = AttachmentGroup.create({
      id: existing.id,
      createdById: existing.createdById,
      key: update.key ?? existing.key,
      ips: update.ips ?? existing.ips,
      attachmentIds: update.attachmentIds ?? existing.attachmentIds,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      expiresAt: update.expiresAt ?? existing.expiresAt,
    });

    this.groups.set(id, replacement);

    return replacement;
  }
}
