import {
  buildAttachment,
  testUuid,
} from 'src/files/__fixtures__/attachment.builder';
import { FakeAttachmentRepository } from 'src/files/__fixtures__/fake-attachment.repository';
import { FakeAttachmentGroupRepository } from '../../__fixtures__/fake-attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import { DeleteAttachmentGroupUseCase } from './delete-attachment-group.use-case';
import { GetAttachmentGroupDetailsUseCase } from './get-attachment-group-details.use-case';
import { GetMyAttachmentGroupsUseCase } from './get-my-attachment-groups.use-case';

const OWNER = testUuid(1);
const STRANGER = testUuid(2);
const GROUP_ID = testUuid(10);

/**
 * The three use-cases that are scoped to the group's creator. Their shared rule — a
 * non-creator is refused even though they can name a valid group id — is the only thing
 * standing between a private group listing and an IDOR.
 */
describe('owner-scoped attachment group use-cases', () => {
  let groups: FakeAttachmentGroupRepository;
  let attachments: FakeAttachmentRepository;

  beforeEach(() => {
    groups = new FakeAttachmentGroupRepository();
    attachments = new FakeAttachmentRepository();
  });

  const seedGroup = (overrides = {}) => {
    const group = AttachmentGroup.create({
      id: GROUP_ID,
      createdById: OWNER,
      key: '1234567890',
      ...overrides,
    });
    groups.seed(group);
    return group;
  };

  describe('DeleteAttachmentGroupUseCase', () => {
    let useCase: DeleteAttachmentGroupUseCase;

    beforeEach(() => {
      useCase = new DeleteAttachmentGroupUseCase(groups);
    });

    it('deletes the caller’s own group', async () => {
      seedGroup();

      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: OWNER }),
      ).resolves.toEqual({ success: true });

      await expect(groups.findById(GROUP_ID)).resolves.toBeNull();
    });

    it('rejects an unknown group', async () => {
      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: OWNER }),
      ).rejects.toThrow('Attachment group not found');
    });

    it('refuses a caller who did not create the group', async () => {
      seedGroup();

      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: STRANGER }),
      ).rejects.toThrow(
        'You do not have permission to delete this attachment group',
      );
    });

    it('leaves the group intact when permission is refused', async () => {
      seedGroup();

      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: STRANGER }),
      ).rejects.toThrow();

      await expect(groups.findById(GROUP_ID)).resolves.not.toBeNull();
    });
  });

  describe('GetAttachmentGroupDetailsUseCase', () => {
    let useCase: GetAttachmentGroupDetailsUseCase;

    beforeEach(() => {
      useCase = new GetAttachmentGroupDetailsUseCase(groups, attachments);
    });

    it('returns the group with its resolved attachments', async () => {
      const file = buildAttachment({ userId: OWNER });
      attachments.seed(file);
      const group = seedGroup({
        ips: ['203.0.113.7'],
        attachmentIds: [file.id],
      });

      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: OWNER }),
      ).resolves.toEqual({
        id: GROUP_ID,
        key: group.key,
        ips: ['203.0.113.7'],
        attachments: [file],
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        expiresAt: undefined,
      });
    });

    it('rejects an unknown group', async () => {
      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: OWNER }),
      ).rejects.toThrow('Attachment group not found');
    });

    it('refuses a caller who did not create the group', async () => {
      seedGroup();

      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: STRANGER }),
      ).rejects.toThrow(
        'You do not have permission to access this attachment group',
      );
    });

    // Unlike the key-based route, this one has no expiry check — an expired group is
    // still visible to its creator.
    it('still shows an expired group to its creator', async () => {
      seedGroup({ expiresAt: new Date(Date.now() - 1000) });

      await expect(
        useCase.execute({ groupId: GROUP_ID, userId: OWNER }),
      ).resolves.toMatchObject({ id: GROUP_ID });
    });
  });

  describe('GetMyAttachmentGroupsUseCase', () => {
    let useCase: GetMyAttachmentGroupsUseCase;

    beforeEach(() => {
      useCase = new GetMyAttachmentGroupsUseCase(groups, attachments);
    });

    // Ids are namespaced per creator; sharing a range would let one call's groups
    // overwrite the other's, since the store is keyed by id.
    const seedMany = (count: number, createdById = OWNER) => {
      const base = createdById === OWNER ? 100 : 200;

      for (let i = 0; i < count; i += 1) {
        groups.seed(
          AttachmentGroup.create({
            id: testUuid(base + i),
            createdById,
            key: `key-${createdById === OWNER ? 'o' : 's'}-${i}`,
          }),
        );
      }
    };

    it('returns only the caller’s groups', async () => {
      seedMany(2, OWNER);
      seedMany(3, STRANGER);

      const result = await useCase.execute({ userId: OWNER });

      expect(result.attachmentGroups).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('resolves each group’s attachments', async () => {
      const file = buildAttachment({ userId: OWNER });
      attachments.seed(file);
      seedGroup({ attachmentIds: [file.id] });

      const result = await useCase.execute({ userId: OWNER });

      expect(result.attachmentGroups[0].attachments).toEqual([file]);
    });

    describe('hasMore', () => {
      it('is false when the page covers everything', async () => {
        seedMany(3);

        const result = await useCase.execute({ userId: OWNER, limit: 10 });

        expect(result.hasMore).toBe(false);
      });

      it('is true when records remain beyond the page', async () => {
        seedMany(5);

        const result = await useCase.execute({ userId: OWNER, limit: 2 });

        expect(result.attachmentGroups).toHaveLength(2);
        expect(result.hasMore).toBe(true);
      });

      // offset + limit === totalCount means the page ends exactly on the last record.
      it('is false on the exact final page', async () => {
        seedMany(4);

        const result = await useCase.execute({
          userId: OWNER,
          limit: 2,
          offset: 2,
        });

        expect(result.hasMore).toBe(false);
      });

      it('is false when the offset is past the end', async () => {
        seedMany(2);

        const result = await useCase.execute({
          userId: OWNER,
          limit: 10,
          offset: 50,
        });

        expect(result.attachmentGroups).toEqual([]);
        expect(result.hasMore).toBe(false);
      });
    });

    it('defaults to a page of 50 from the start', async () => {
      seedMany(1);

      const result = await useCase.execute({ userId: OWNER });

      expect(result.hasMore).toBe(false);
      expect(result.attachmentGroups).toHaveLength(1);
    });

    it('returns an empty page for a user with no groups', async () => {
      await expect(useCase.execute({ userId: OWNER })).resolves.toEqual({
        attachmentGroups: [],
        totalCount: 0,
        hasMore: false,
      });
    });
  });
});
