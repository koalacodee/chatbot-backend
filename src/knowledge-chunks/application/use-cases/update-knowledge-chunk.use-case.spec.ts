import { NotFoundException } from '@nestjs/common';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';
import { FilesService } from 'src/files/domain/services/files.service';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { Point } from 'src/shared/entities/point.entity';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { PointRepository } from '../../domain/repositories/point.repository';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { UpdateKnowledgeChunkUseCase } from './update-knowledge-chunk.use-case';

const CHUNK_ID = '018f4a1e-1c7a-7000-8000-000000000e01';
const DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000e02';
const NEW_DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000e05';
const POINT_ID = '018f4a1e-1c7a-7000-8000-000000000e03';
const USER_ID = '018f4a1e-1c7a-7000-8000-000000000e04';

const buildDepartment = (id = DEPT_ID) =>
  Department.create({ id, name: 'Support' });

/**
 * Builds the chunk the repository would return. `withDepartment` is the crux: the real
 * `findById` performs no join and never populates it, so `false` is what production
 * actually hands this use-case.
 */
const buildChunk = (withDepartment: boolean, pointId?: string) => {
  const chunk = KnowledgeChunk.create({
    id: CHUNK_ID,
    content: 'Refunds take five days.',
    departmentId: DEPT_ID,
    department: withDepartment ? buildDepartment() : undefined,
  });
  if (pointId) chunk.updatePointId(pointId);
  return chunk;
};

interface Options {
  chunk?: KnowledgeChunk | null;
  department?: Department | null;
}

function build(options: Options = {}) {
  const saved: KnowledgeChunk[] = [];
  const savedPoints: Point[] = [];
  const accessChecks: Array<{ userId: string; departmentId: string }> = [];
  const clonedTo: string[] = [];
  const deleted: string[][] = [];

  const chunks = stubRepository<KnowledgeChunkRepository>(
    'KnowledgeChunkRepository',
    {
      findById: async () =>
        options.chunk === undefined ? buildChunk(false) : options.chunk,
      save: async (chunk: KnowledgeChunk) => {
        saved.push(chunk);
        return chunk;
      },
    },
  );

  const embedding = stubRepository<EmbeddingService>('EmbeddingService', {
    embed: async () => new Array(2048).fill(0.1),
  });

  const departments = stubRepository<DepartmentRepository>(
    'DepartmentRepository',
    {
      findById: async () =>
        options.department === undefined
          ? buildDepartment(NEW_DEPT_ID)
          : options.department,
    },
  );

  const points = stubRepository<PointRepository>('PointRepository', {
    save: async (point: Point) => {
      savedPoints.push(point);
      return point;
    },
  });

  const accessControl = stubRepository<AccessControlService>(
    'AccessControlService',
    {
      canAccessDepartment: async (userId: string, departmentId: string) => {
        accessChecks.push({ userId, departmentId });
        return true as any;
      },
    },
  );

  const files = stubRepository<FilesService>('FilesService', {
    genUploadKey: async () => 'upload-key',
  });

  const fileHub = stubRepository<FileHubService>('FileHubService', {
    generateUploadToken: async () => ({ uploadKey: 'filehub-key' }) as any,
  });

  const deleteAttachments = stubRepository<DeleteAttachmentsByIdsUseCase>(
    'DeleteAttachmentsByIdsUseCase',
    {
      execute: async ({ attachmentIds }: any) => {
        deleted.push(attachmentIds);
        return undefined as any;
      },
    },
  );

  const cloneAttachment = stubRepository<CloneAttachmentUseCase>(
    'CloneAttachmentUseCase',
    {
      execute: async ({ targetId }: any) => {
        clonedTo.push(targetId);
        return undefined as any;
      },
    },
  );

  return {
    saved,
    savedPoints,
    accessChecks,
    clonedTo,
    deleted,
    useCase: new UpdateKnowledgeChunkUseCase(
      chunks,
      embedding,
      departments,
      points,
      accessControl,
      files,
      deleteAttachments,
      cloneAttachment,
      fileHub,
    ),
  };
}

describe('UpdateKnowledgeChunkUseCase', () => {
  /**
   * The repository's `findById` selects a bare row and never populates `department`, so
   * this is the shape production actually hands the use-case. Everything here must work
   * from `departmentId` alone.
   */
  describe('with a chunk as the repository actually returns it', () => {
    it('succeeds without a department object attached', async () => {
      const { useCase, saved } = build({ chunk: buildChunk(false) });

      await expect(
        useCase.execute(CHUNK_ID, { userId: USER_ID, content: 'new text' }),
      ).resolves.toMatchObject({ knowledgeChunk: expect.anything() });

      expect(saved).toHaveLength(1);
    });

    it('checks access against departmentId, not the unloaded object', async () => {
      const { useCase, accessChecks } = build({ chunk: buildChunk(false) });

      await useCase.execute(CHUNK_ID, { userId: USER_ID });

      expect(accessChecks).toEqual([{ userId: USER_ID, departmentId: DEPT_ID }]);
    });

    /** The not-found guard runs before anything dereferences the chunk. */
    it('reports a missing chunk as NotFoundException', async () => {
      const { useCase } = build({ chunk: null });

      await expect(
        useCase.execute(CHUNK_ID, { userId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not check access for a chunk that does not exist', async () => {
      const { useCase, accessChecks } = build({ chunk: null });

      await expect(
        useCase.execute(CHUNK_ID, { userId: USER_ID }),
      ).rejects.toThrow(NotFoundException);

      expect(accessChecks).toHaveLength(0);
    });
  });

  describe('with a hydrated chunk', () => {
    const hydrated = (pointId?: string) => build({ chunk: buildChunk(true, pointId) });

    it('checks access against the chunk’s department', async () => {
      const { useCase, accessChecks } = hydrated();

      await useCase.execute(CHUNK_ID, { userId: USER_ID });

      expect(accessChecks).toEqual([
        { userId: USER_ID, departmentId: DEPT_ID },
      ]);
    });

    it('saves without touching the embedding when no content is given', async () => {
      const { useCase, saved, savedPoints } = hydrated();

      await useCase.execute(CHUNK_ID, { userId: USER_ID });

      expect(saved).toHaveLength(1);
      expect(savedPoints).toHaveLength(0);
    });

    describe('re-embedding on content change', () => {
      it('updates the existing point when the chunk already has one', async () => {
        const { useCase, savedPoints } = hydrated(POINT_ID);

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          content: 'new text',
        });

        expect(savedPoints).toHaveLength(1);
        expect(savedPoints[0].id.value).toBe(POINT_ID);
      });

      it('creates a point and links it when the chunk has none', async () => {
        const { useCase, savedPoints, saved } = hydrated();

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          content: 'new text',
        });

        expect(savedPoints).toHaveLength(1);
        expect(saved[0].pointId).toBe(savedPoints[0].id.value);
      });

      it('writes the new content onto the chunk', async () => {
        const { useCase, saved } = hydrated(POINT_ID);

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          content: 'new text',
        });

        expect(saved[0].content).toBe('new text');
      });
    });

    describe('moving departments', () => {
      it('attaches the new department', async () => {
        const { useCase, saved } = hydrated();

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          departmentId: NEW_DEPT_ID,
        });

        expect(saved[0].department?.id.value).toBe(NEW_DEPT_ID);
      });

      it('rejects a department that does not exist', async () => {
        const { useCase } = build({
          chunk: buildChunk(true),
          department: null,
        });

        await expect(
          useCase.execute(CHUNK_ID, {
            userId: USER_ID,
            departmentId: NEW_DEPT_ID,
          }),
        ).rejects.toThrow(NotFoundException);
      });

      /**
       * `departmentId` is what the repository persists, so it has to move with the
       * object — otherwise the write is a silent no-op.
       */
      it('moves departmentId along with the department', async () => {
        const { useCase, saved } = hydrated();

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          departmentId: NEW_DEPT_ID,
        });

        expect(saved[0].departmentId).toBe(NEW_DEPT_ID);
      });
    });

    describe('attachments', () => {
      it('issues upload keys only when attach is set', async () => {
        const { useCase } = hydrated();

        const withoutAttach = await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
        });
        expect(withoutAttach.uploadKey).toBeUndefined();
        expect(withoutAttach.fileHubUploadKey).toBeUndefined();

        const withAttach = await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          attach: true,
        });
        expect(withAttach.uploadKey).toBe('upload-key');
        expect(withAttach.fileHubUploadKey).toBe('filehub-key');
      });

      it('deletes the listed attachments', async () => {
        const { useCase, deleted } = hydrated();

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          deleteAttachments: ['a', 'b'],
        });

        expect(deleted).toEqual([['a', 'b']]);
      });

      it('clones chosen attachments onto this chunk', async () => {
        const { useCase, clonedTo } = hydrated();

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          chooseAttachments: ['x'],
        });

        expect(clonedTo).toEqual([CHUNK_ID]);
      });

      it('skips both attachment paths when the lists are empty', async () => {
        const { useCase, deleted, clonedTo } = hydrated();

        await useCase.execute(CHUNK_ID, {
          userId: USER_ID,
          deleteAttachments: [],
          chooseAttachments: [],
        });

        expect(deleted).toHaveLength(0);
        expect(clonedTo).toHaveLength(0);
      });
    });
  });
});
