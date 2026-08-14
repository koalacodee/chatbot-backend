import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from '../../domain/entities/department.entity';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { DepartmentHierarchyService } from './department-hierarchy.service';

const PARENT = '018f4a1e-1c7a-7000-8000-000000000401';
const OTHER_PARENT = '018f4a1e-1c7a-7000-8000-000000000402';
const SUB = '018f4a1e-1c7a-7000-8000-000000000403';
const OTHER_SUB = '018f4a1e-1c7a-7000-8000-000000000404';

const dept = (id: string, parentId?: string) =>
  Department.create({
    id,
    name: `dept-${id.slice(-3)}`,
    parentId,
    parent: parentId
      ? Department.create({ id: parentId, name: 'parent' })
      : undefined,
  });

/**
 * This service answers "may this user see this department?" for task approval and
 * dashboard scoping. `hasHierarchicalAccess` in particular is the batch check behind
 * supervisor permissions, and its failure mode is silent over-permission — so the
 * negative cases matter more than the positive ones.
 */
describe('DepartmentHierarchyService', () => {
  const build = (departments: Department[] = []) => {
    const byId = new Map(departments.map((d) => [d.id.value, d]));

    const repository = stubRepository<DepartmentRepository>(
      'DepartmentRepository',
      {
        findById: async (id: string) => byId.get(id) ?? null,
        findByIds: async (ids: string[]) =>
          ids
            .map((id) => byId.get(id))
            .filter((d): d is Department => d !== undefined),
        findAllSubDepartmentsByParentIds: async (parentIds: string[]) =>
          departments.filter(
            (d) => d.parentId && parentIds.includes(d.parentId.value),
          ),
      },
    );

    return new DepartmentHierarchyService(repository);
  };

  describe('isSubDepartmentOf', () => {
    it('is true for a real parent/child pair', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.isSubDepartmentOf(SUB, PARENT)).resolves.toBe(true);
    });

    it('is false for an unrelated parent', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.isSubDepartmentOf(SUB, OTHER_PARENT)).resolves.toBe(
        false,
      );
    });

    it('is false for a department with no parent', async () => {
      const service = build([dept(PARENT)]);

      await expect(service.isSubDepartmentOf(PARENT, PARENT)).resolves.toBe(
        false,
      );
    });

    it('is false when the department does not exist', async () => {
      const service = build([]);

      await expect(service.isSubDepartmentOf(SUB, PARENT)).resolves.toBe(false);
    });

    it.each([
      ['', PARENT],
      [SUB, ''],
      [undefined as any, PARENT],
      [SUB, undefined as any],
    ])('short-circuits to false for missing ids (%p, %p)', async (a, b) => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.isSubDepartmentOf(a, b)).resolves.toBe(false);
    });
  });

  describe('getParentDepartmentIds', () => {
    it('returns the single parent', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.getParentDepartmentIds(SUB)).resolves.toEqual([
        PARENT,
      ]);
    });

    it('returns empty for a top-level department', async () => {
      const service = build([dept(PARENT)]);

      await expect(service.getParentDepartmentIds(PARENT)).resolves.toEqual([]);
    });

    it('returns empty for an unknown department', async () => {
      await expect(build([]).getParentDepartmentIds(SUB)).resolves.toEqual([]);
    });
  });

  describe('hasHierarchicalAccess', () => {
    it('grants direct access', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.hasHierarchicalAccess(SUB, [SUB])).resolves.toBe(
        true,
      );
    });

    it('grants access through the parent', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.hasHierarchicalAccess(SUB, [PARENT])).resolves.toBe(
        true,
      );
    });

    it('refuses an unrelated department', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(
        service.hasHierarchicalAccess(SUB, [OTHER_PARENT]),
      ).resolves.toBe(false);
    });

    it('accepts a bare id as well as an array', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(service.hasHierarchicalAccess([SUB], [PARENT])).resolves.toBe(
        true,
      );
    });

    describe('empty inputs', () => {
      it('refuses when the user has no departments', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(service.hasHierarchicalAccess(SUB, [])).resolves.toBe(
          false,
        );
      });

      it('refuses when no departments are requested', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(service.hasHierarchicalAccess([], [PARENT])).resolves.toBe(
          false,
        );
      });
    });

    describe('batch semantics — access to ALL, not ANY', () => {
      it('grants when every requested department is reachable', async () => {
        const service = build([dept(SUB, PARENT), dept(OTHER_SUB, PARENT)]);

        await expect(
          service.hasHierarchicalAccess([SUB, OTHER_SUB], [PARENT]),
        ).resolves.toBe(true);
      });

      /**
       * The critical negative: one reachable department must not carry an unreachable one
       * along with it.
       */
      it('refuses when only some are reachable', async () => {
        const service = build([
          dept(SUB, PARENT),
          dept(OTHER_SUB, OTHER_PARENT),
        ]);

        await expect(
          service.hasHierarchicalAccess([SUB, OTHER_SUB], [PARENT]),
        ).resolves.toBe(false);
      });

      it('mixes direct and parent access across the batch', async () => {
        const service = build([dept(SUB, PARENT), dept(OTHER_SUB, OTHER_PARENT)]);

        await expect(
          service.hasHierarchicalAccess([SUB, OTHER_SUB], [PARENT, OTHER_SUB]),
        ).resolves.toBe(true);
      });

      it('refuses when any requested department does not exist', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(
          service.hasHierarchicalAccess([SUB, OTHER_SUB], [PARENT]),
        ).resolves.toBe(false);
      });

      /**
       * The fast path returns true when every id is directly listed, without loading
       * anything — so a directly-granted id is trusted even if no such department exists.
       */
      it('trusts the fast path without verifying the departments exist', async () => {
        const service = build([]);

        await expect(
          service.hasHierarchicalAccess([OTHER_SUB], [OTHER_SUB]),
        ).resolves.toBe(true);
      });
    });
  });

  describe('validateSupervisorAccess', () => {
    it('always refuses DEPARTMENT level — admins only', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(
        service.validateSupervisorAccess([PARENT], 'DEPARTMENT', {
          targetDepartmentId: PARENT,
        }),
      ).resolves.toBe(false);
    });

    describe('SUB_DEPARTMENT level', () => {
      it('grants when the supervisor owns the parent', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(
          service.validateSupervisorAccess([PARENT], 'SUB_DEPARTMENT', {
            targetSubDepartmentId: SUB,
          }),
        ).resolves.toBe(true);
      });

      it('refuses an unrelated sub-department', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(
          service.validateSupervisorAccess([OTHER_PARENT], 'SUB_DEPARTMENT', {
            targetSubDepartmentId: SUB,
          }),
        ).resolves.toBe(false);
      });

      it('refuses when the target is missing from the context', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(
          service.validateSupervisorAccess([PARENT], 'SUB_DEPARTMENT', {}),
        ).resolves.toBe(false);
      });
    });

    describe('EMPLOYEE level', () => {
      it('grants through the assignee’s department', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(
          service.validateSupervisorAccess([PARENT], 'EMPLOYEE', {
            assigneeDepartmentId: SUB,
          }),
        ).resolves.toBe(true);
      });

      it('refuses when the assignee department is missing', async () => {
        const service = build([dept(SUB, PARENT)]);

        await expect(
          service.validateSupervisorAccess([PARENT], 'EMPLOYEE', {}),
        ).resolves.toBe(false);
      });
    });

    it('refuses an unrecognised level', async () => {
      const service = build([dept(SUB, PARENT)]);

      await expect(
        service.validateSupervisorAccess([PARENT], 'NONSENSE' as any, {
          targetSubDepartmentId: SUB,
        }),
      ).resolves.toBe(false);
    });
  });

  describe('getSubDepartmentIdsForParents', () => {
    it('collects children across several parents', async () => {
      const service = build([
        dept(SUB, PARENT),
        dept(OTHER_SUB, OTHER_PARENT),
        dept(PARENT),
      ]);

      await expect(
        service.getSubDepartmentIdsForParents([PARENT, OTHER_PARENT]),
      ).resolves.toEqual([SUB, OTHER_SUB]);
    });

    it('returns empty for a parent with no children', async () => {
      const service = build([dept(PARENT)]);

      await expect(
        service.getSubDepartmentIdsForParents([PARENT]),
      ).resolves.toEqual([]);
    });

    it.each([[[]], [undefined as any]])(
      'short-circuits on empty input (%p)',
      async (input) => {
        // Nothing is stubbed for the repository call, so reaching it would throw.
        await expect(
          build([]).getSubDepartmentIdsForParents(input),
        ).resolves.toEqual([]);
      },
    );
  });

  describe('getEmployeeDepartmentId', () => {
    /** Declared but never implemented — pinned so the stub is not mistaken for a lookup. */
    it('is a stub that always returns null', async () => {
      await expect(
        build([]).getEmployeeDepartmentId('any-employee'),
      ).resolves.toBeNull();
    });
  });
});
