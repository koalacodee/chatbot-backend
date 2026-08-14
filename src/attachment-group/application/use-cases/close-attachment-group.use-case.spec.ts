import { testUuid } from 'src/files/__fixtures__/attachment.builder';
import { FakeAttachmentGroupRepository } from '../../__fixtures__/fake-attachment-group.repository';
import { AttachmentGroup } from '../../domain/entities/attachment-group.entity';
import { CloseAttachmentGroupUseCase } from './close-attachment-group.use-case';

const OWNER = testUuid(1);
const KEY = '1234567890';
const IP = '203.0.113.7';
const OTHER_IP = '198.51.100.4';

/**
 * The inverse of the key-based read: a viewer leaving drops their IP from the group's
 * active list. Note there is no ownership check — anyone holding the key can remove an
 * IP, which is consistent with how the IP got recorded in the first place.
 */
describe('CloseAttachmentGroupUseCase', () => {
  let groups: FakeAttachmentGroupRepository;
  let useCase: CloseAttachmentGroupUseCase;

  beforeEach(() => {
    groups = new FakeAttachmentGroupRepository();
    useCase = new CloseAttachmentGroupUseCase(groups);
  });

  const seedGroup = (ips: string[]) => {
    const group = AttachmentGroup.create({
      createdById: OWNER,
      key: KEY,
      ips,
    });
    groups.seed(group);
    return group;
  };

  it('rejects an unknown key', async () => {
    await expect(useCase.execute({ key: 'nope', ip: IP })).rejects.toThrow(
      'Attachment group not found',
    );
  });

  it('removes the caller’s ip', async () => {
    seedGroup([IP, OTHER_IP]);

    await expect(useCase.execute({ key: KEY, ip: IP })).resolves.toEqual({
      success: true,
    });

    expect(groups.updates).toEqual([
      { id: expect.any(String), update: { ips: [OTHER_IP] } },
    ]);
  });

  it('leaves other viewers untouched', async () => {
    seedGroup([IP, OTHER_IP]);

    await useCase.execute({ key: KEY, ip: IP });

    const group = await groups.findByKey(KEY);
    expect(group?.ips).toEqual([OTHER_IP]);
  });

  it('empties the list when the last viewer leaves', async () => {
    seedGroup([IP]);

    await useCase.execute({ key: KEY, ip: IP });

    const group = await groups.findByKey(KEY);
    expect(group?.ips).toEqual([]);
  });

  describe('when the ip was never recorded', () => {
    it('still reports success', async () => {
      seedGroup([OTHER_IP]);

      await expect(useCase.execute({ key: KEY, ip: IP })).resolves.toEqual({
        success: true,
      });
    });

    // The early return exists to avoid a pointless write; pinning it keeps that
    // optimisation from being refactored away silently.
    it('skips the write entirely', async () => {
      seedGroup([OTHER_IP]);

      await useCase.execute({ key: KEY, ip: IP });

      expect(groups.updates).toHaveLength(0);
    });

    it('skips the write on an already-empty group', async () => {
      seedGroup([]);

      await useCase.execute({ key: KEY, ip: IP });

      expect(groups.updates).toHaveLength(0);
    });
  });

  it('removes every copy if an ip was somehow recorded twice', async () => {
    seedGroup([IP, OTHER_IP, IP]);

    await useCase.execute({ key: KEY, ip: IP });

    expect(groups.updates[0].update.ips).toEqual([OTHER_IP]);
  });
});
