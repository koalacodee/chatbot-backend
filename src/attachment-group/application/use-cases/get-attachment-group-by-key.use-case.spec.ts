import { GoneException } from '@nestjs/common';
import {
  buildAttachment,
  testUuid,
} from 'src/files/__fixtures__/attachment.builder';
import { FakeAttachmentRepository } from 'src/files/__fixtures__/fake-attachment.repository';
import { FakeAttachmentGroupRepository } from '../../__fixtures__/fake-attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import { GetAttachmentGroupByKeyUseCase } from './get-attachment-group-by-key.use-case';

const OWNER = testUuid(1);
const KEY = '1234567890';
const VISITOR_IP = '203.0.113.7';

describe('GetAttachmentGroupByKeyUseCase', () => {
  let groups: FakeAttachmentGroupRepository;
  let attachments: FakeAttachmentRepository;
  let useCase: GetAttachmentGroupByKeyUseCase;

  beforeEach(() => {
    groups = new FakeAttachmentGroupRepository();
    attachments = new FakeAttachmentRepository();
    useCase = new GetAttachmentGroupByKeyUseCase(groups, attachments);
  });

  const seedGroup = (overrides = {}) => {
    const group = AttachmentGroup.create({
      createdById: OWNER,
      key: KEY,
      ...overrides,
    });
    groups.seed(group);
    return group;
  };

  it('rejects an unknown key', async () => {
    await expect(
      useCase.execute({ key: 'nope', ip: VISITOR_IP }),
    ).rejects.toThrow('Attachment group not found');
  });

  describe('expiry', () => {
    it('refuses an expired group with 410 Gone', async () => {
      seedGroup({ expiresAt: new Date(Date.now() - 1000) });

      await expect(
        useCase.execute({ key: KEY, ip: VISITOR_IP }),
      ).rejects.toThrow(GoneException);
    });

    it('serves a group whose expiry is still ahead', async () => {
      seedGroup({ expiresAt: new Date(Date.now() + 60_000) });

      await expect(
        useCase.execute({ key: KEY, ip: VISITOR_IP }),
      ).resolves.toEqual({ attachments: [] });
    });

    it('serves a group with no expiry at all', async () => {
      seedGroup();

      await expect(
        useCase.execute({ key: KEY, ip: VISITOR_IP }),
      ).resolves.toEqual({ attachments: [] });
    });

    /**
     * Expiry is checked before the visitor's IP is recorded, so a refused request leaves
     * no trace on the group.
     */
    it('does not record the ip of a refused visitor', async () => {
      seedGroup({ expiresAt: new Date(Date.now() - 1000) });

      await expect(
        useCase.execute({ key: KEY, ip: VISITOR_IP }),
      ).rejects.toThrow(GoneException);

      expect(groups.updates).toHaveLength(0);
    });
  });

  describe('visitor ip tracking', () => {
    it('records a first-time visitor', async () => {
      seedGroup();

      await useCase.execute({ key: KEY, ip: VISITOR_IP });

      expect(groups.updates).toEqual([
        { id: expect.any(String), update: { ips: [VISITOR_IP] } },
      ]);
    });

    it('does not write again for a returning visitor', async () => {
      seedGroup({ ips: [VISITOR_IP] });

      await useCase.execute({ key: KEY, ip: VISITOR_IP });

      expect(groups.updates).toHaveLength(0);
    });

    it('appends rather than replacing when a second visitor arrives', async () => {
      seedGroup({ ips: ['198.51.100.4'] });

      await useCase.execute({ key: KEY, ip: VISITOR_IP });

      expect(groups.updates[0].update.ips).toEqual([
        '198.51.100.4',
        VISITOR_IP,
      ]);
    });
  });

  describe('returned attachments', () => {
    it('resolves the group members', async () => {
      const first = buildAttachment();
      const second = buildAttachment();
      attachments.seed(first, second);
      seedGroup({ attachmentIds: [first.id, second.id] });

      const result = await useCase.execute({ key: KEY, ip: VISITOR_IP });

      expect(result.attachments).toEqual([first, second]);
    });

    /**
     * Membership is what grants access here — the key holder gets the files regardless of
     * who owns them. That is the intended sharing behaviour, pinned so a later ownership
     * filter cannot be added by accident.
     */
    it('serves attachments the visitor does not own', async () => {
      const someoneElses = buildAttachment({ userId: testUuid(99) });
      attachments.seed(someoneElses);
      seedGroup({ attachmentIds: [someoneElses.id] });

      const result = await useCase.execute({ key: KEY, ip: VISITOR_IP });

      expect(result.attachments).toEqual([someoneElses]);
    });

    it('silently drops members whose attachment no longer exists', async () => {
      const present = buildAttachment();
      attachments.seed(present);
      seedGroup({ attachmentIds: [present.id, testUuid(4242)] });

      const result = await useCase.execute({ key: KEY, ip: VISITOR_IP });

      expect(result.attachments).toEqual([present]);
    });
  });
});
