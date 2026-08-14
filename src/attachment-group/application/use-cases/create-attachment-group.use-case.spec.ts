import {
  buildAttachment,
  testUuid,
} from 'src/files/__fixtures__/attachment.builder';
import { FakeAttachmentRepository } from 'src/files/__fixtures__/fake-attachment.repository';
import { FakeAttachmentGroupRepository } from '../../__fixtures__/fake-attachment-group.repository';
import { CreateAttachmentGroupUseCase } from './create-attachment-group.use-case';

const OWNER = testUuid(1);
const STRANGER = testUuid(2);

describe('CreateAttachmentGroupUseCase', () => {
  let groups: FakeAttachmentGroupRepository;
  let attachments: FakeAttachmentRepository;
  let useCase: CreateAttachmentGroupUseCase;

  beforeEach(() => {
    groups = new FakeAttachmentGroupRepository();
    attachments = new FakeAttachmentRepository();
    useCase = new CreateAttachmentGroupUseCase(groups, attachments);
  });

  describe('attachment validation', () => {
    it('rejects ids that do not resolve to an attachment', async () => {
      const mine = buildAttachment({ userId: OWNER });
      attachments.seed(mine);

      await expect(
        useCase.execute({
          userId: OWNER,
          attachmentIds: [mine.id, testUuid(999)],
        }),
      ).rejects.toThrow('One or more attachments do not exist');
    });

    it('rejects attachments owned by somebody else', async () => {
      const theirs = buildAttachment({ userId: STRANGER });
      attachments.seed(theirs);

      await expect(
        useCase.execute({ userId: OWNER, attachmentIds: [theirs.id] }),
      ).rejects.toThrow(
        'You do not have permission to access one or more attachments',
      );
    });

    it('allows global attachments regardless of owner', async () => {
      const shared = buildAttachment({ userId: STRANGER, isGlobal: true });
      attachments.seed(shared);

      await expect(
        useCase.execute({ userId: OWNER, attachmentIds: [shared.id] }),
      ).resolves.toEqual({ key: expect.any(String) });
    });

    it('allows a mix of own and global attachments', async () => {
      const mine = buildAttachment({ userId: OWNER });
      const shared = buildAttachment({ userId: STRANGER, isGlobal: true });
      attachments.seed(mine, shared);

      await useCase.execute({
        userId: OWNER,
        attachmentIds: [mine.id, shared.id],
      });

      const [saved] = [...groups.groups.values()];
      expect(saved.attachmentIds).toEqual([mine.id, shared.id]);
    });

    /**
     * The existence check compares lengths, so a duplicated id makes the request array
     * longer than the resolved set and the group is rejected — worth pinning, because it
     * is a length comparison rather than a set comparison and reads as accidental.
     */
    it('rejects a duplicated attachment id', async () => {
      const mine = buildAttachment({ userId: OWNER });
      attachments.seed(mine);

      await expect(
        useCase.execute({ userId: OWNER, attachmentIds: [mine.id, mine.id] }),
      ).rejects.toThrow('One or more attachments do not exist');
    });

    it('accepts an empty attachment list', async () => {
      await expect(
        useCase.execute({ userId: OWNER, attachmentIds: [] }),
      ).resolves.toEqual({ key: expect.any(String) });
    });
  });

  describe('the generated key', () => {
    it('is ten digits', async () => {
      const { key } = await useCase.execute({
        userId: OWNER,
        attachmentIds: [],
      });

      expect(key).toMatch(/^\d{10}$/);
    });

    it('differs between groups', async () => {
      const keys = new Set<string>();

      for (let i = 0; i < 25; i += 1) {
        const { key } = await useCase.execute({
          userId: OWNER,
          attachmentIds: [],
        });
        keys.add(key);
      }

      // randomInt over a 9-billion range; a collision in 25 draws would mean the source
      // of randomness is broken, not unlucky.
      expect(keys.size).toBe(25);
    });

    it('is the key stored on the saved group', async () => {
      const { key } = await useCase.execute({
        userId: OWNER,
        attachmentIds: [],
      });

      await expect(groups.findByKey(key)).resolves.not.toBeNull();
    });
  });

  it('records the caller as creator', async () => {
    const { key } = await useCase.execute({ userId: OWNER, attachmentIds: [] });

    const saved = await groups.findByKey(key);
    expect(saved?.createdById).toBe(OWNER);
  });

  it('persists the expiry when given one', async () => {
    const expiresAt = new Date('2026-12-31T23:59:59.000Z');

    const { key } = await useCase.execute({
      userId: OWNER,
      attachmentIds: [],
      expiresAt,
    });

    const saved = await groups.findByKey(key);
    expect(saved?.expiresAt).toEqual(expiresAt);
  });

  it('leaves the group non-expiring when no expiry is given', async () => {
    const { key } = await useCase.execute({ userId: OWNER, attachmentIds: [] });

    const saved = await groups.findByKey(key);
    expect(saved?.expiresAt).toBeUndefined();
    expect(saved?.isExpired()).toBeFalsy();
  });
});
