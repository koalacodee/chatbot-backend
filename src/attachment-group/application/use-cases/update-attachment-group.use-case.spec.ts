import {
  buildAttachment,
  testUuid,
} from 'src/files/__fixtures__/attachment.builder';
import { FakeAttachmentRepository } from 'src/files/__fixtures__/fake-attachment.repository';
import { FakeAttachmentGroupRepository } from '../../__fixtures__/fake-attachment-group.repository';
import { RecordingNotificationService } from '../../__fixtures__/recording-notification.service';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import { UpdateAttachmentGroupUseCase } from './update-attachment-group.use-case';

const OWNER = testUuid(1);
const STRANGER = testUuid(2);
const GROUP_ID = testUuid(10);
const KEY = '1234567890';

describe('UpdateAttachmentGroupUseCase', () => {
  let groups: FakeAttachmentGroupRepository;
  let attachments: FakeAttachmentRepository;
  let notifications: RecordingNotificationService;
  let useCase: UpdateAttachmentGroupUseCase;

  beforeEach(() => {
    groups = new FakeAttachmentGroupRepository();
    attachments = new FakeAttachmentRepository();
    notifications = new RecordingNotificationService();
    useCase = new UpdateAttachmentGroupUseCase(
      groups,
      attachments,
      notifications,
    );
  });

  const seedGroup = (overrides = {}) => {
    const group = AttachmentGroup.create({
      id: GROUP_ID,
      createdById: OWNER,
      key: KEY,
      ...overrides,
    });
    groups.seed(group);
    return group;
  };

  describe('authorisation', () => {
    it('rejects an unknown group', async () => {
      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: OWNER,
          attachmentIds: [],
        }),
      ).rejects.toThrow('Attachment group not found');
    });

    it('refuses a caller who did not create the group', async () => {
      seedGroup();

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: STRANGER,
          attachmentIds: [],
        }),
      ).rejects.toThrow(
        'You do not have permission to update this attachment group',
      );
    });

    /**
     * Ownership is checked before the attachment lookup, so a stranger cannot use this
     * endpoint to probe which attachment ids exist.
     */
    it('refuses before looking any attachments up', async () => {
      seedGroup();

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: STRANGER,
          attachmentIds: [testUuid(555)],
        }),
      ).rejects.toThrow('You do not have permission to update');

      expect(groups.updates).toHaveLength(0);
    });
  });

  describe('attachment validation', () => {
    it('rejects ids that do not resolve', async () => {
      seedGroup();

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: OWNER,
          attachmentIds: [testUuid(555)],
        }),
      ).rejects.toThrow('One or more attachments do not exist');
    });

    it('rejects attachments owned by somebody else', async () => {
      const theirs = buildAttachment({ userId: STRANGER });
      attachments.seed(theirs);
      seedGroup();

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: OWNER,
          attachmentIds: [theirs.id],
        }),
      ).rejects.toThrow(
        'You do not have permission to access one or more attachments',
      );
    });

    it('allows global attachments owned by others', async () => {
      const shared = buildAttachment({ userId: STRANGER, isGlobal: true });
      attachments.seed(shared);
      seedGroup();

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: OWNER,
          attachmentIds: [shared.id],
        }),
      ).resolves.toEqual({ success: true });
    });

    it('does not persist anything when validation fails', async () => {
      seedGroup();

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: OWNER,
          attachmentIds: [testUuid(555)],
        }),
      ).rejects.toThrow();

      expect(groups.updates).toHaveLength(0);
      expect(notifications.notifications).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('replaces the attachment set', async () => {
      const first = buildAttachment({ userId: OWNER });
      const second = buildAttachment({ userId: OWNER });
      attachments.seed(first, second);
      seedGroup({ attachmentIds: [first.id] });

      await useCase.execute({
        groupId: GROUP_ID,
        userId: OWNER,
        attachmentIds: [second.id],
      });

      const group = await groups.findById(GROUP_ID);
      expect(group?.attachmentIds).toEqual([second.id]);
    });

    it('writes the expiry through', async () => {
      const expiresAt = new Date('2026-12-31T23:59:59.000Z');
      seedGroup();

      await useCase.execute({
        groupId: GROUP_ID,
        userId: OWNER,
        attachmentIds: [],
        expiresAt,
      });

      expect(groups.updates[0].update).toEqual({
        attachmentIds: [],
        expiresAt,
      });
    });

    it('can empty the group', async () => {
      const file = buildAttachment({ userId: OWNER });
      attachments.seed(file);
      seedGroup({ attachmentIds: [file.id] });

      await useCase.execute({
        groupId: GROUP_ID,
        userId: OWNER,
        attachmentIds: [],
      });

      const group = await groups.findById(GROUP_ID);
      expect(group?.attachmentIds).toEqual([]);
    });
  });

  describe('notification', () => {
    it('broadcasts on the group key, not its id', async () => {
      const file = buildAttachment({ userId: OWNER });
      attachments.seed(file);
      seedGroup();

      await useCase.execute({
        groupId: GROUP_ID,
        userId: OWNER,
        attachmentIds: [file.id],
      });

      expect(notifications.notifications).toHaveLength(1);
      expect(notifications.notifications[0].groupKey).toBe(KEY);
    });

    it('includes the new ids and the serialised attachments', async () => {
      const file = buildAttachment({ userId: OWNER });
      attachments.seed(file);
      seedGroup();

      await useCase.execute({
        groupId: GROUP_ID,
        userId: OWNER,
        attachmentIds: [file.id],
      });

      expect(notifications.notifications[0].data).toEqual({
        attachmentIds: [file.id],
        attachments: [file.toJSON()],
        updatedAt: expect.any(Date),
      });
    });

    /**
     * The notify call is wrapped in try/catch specifically so a websocket failure cannot
     * fail a write that already committed. Without this test that guarantee is invisible
     * and a later refactor could drop the catch.
     */
    it('still succeeds when the broadcast throws', async () => {
      const file = buildAttachment({ userId: OWNER });
      attachments.seed(file);
      seedGroup();
      notifications.failWith(new Error('socket is down'));

      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await expect(
        useCase.execute({
          groupId: GROUP_ID,
          userId: OWNER,
          attachmentIds: [file.id],
        }),
      ).resolves.toEqual({ success: true });

      // and the update is still persisted
      const group = await groups.findById(GROUP_ID);
      expect(group?.attachmentIds).toEqual([file.id]);
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
