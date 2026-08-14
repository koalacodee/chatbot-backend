import { BadRequestException } from '@nestjs/common';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Department, DepartmentVisibility } from './department.entity';

const DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000401';
const PARENT_ID = '018f4a1e-1c7a-7000-8000-000000000402';
const SUB_ID = '018f4a1e-1c7a-7000-8000-000000000403';

const build = (overrides = {}) =>
  Department.create({ id: DEPT_ID, name: 'Support', ...overrides });

describe('Department', () => {
  describe('construction', () => {
    it('defaults visibility to PUBLIC', () => {
      expect(build().visibility).toBe(DepartmentVisibility.PUBLIC);
    });

    it('keeps an explicit visibility', () => {
      expect(
        build({ visibility: DepartmentVisibility.PRIVATE }).visibility,
      ).toBe(DepartmentVisibility.PRIVATE);
    });

    it('generates an id when none is supplied', () => {
      expect(Department.create({ name: 'X' }).id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('rejects a malformed id', () => {
      expect(() => Department.create({ id: 'nope', name: 'X' })).toThrow(
        BadRequestException,
      );
    });

    it('leaves parentId undefined for a main department', () => {
      expect(build().parentId).toBeUndefined();
    });

    it('wraps a supplied parentId', () => {
      expect(build({ parentId: PARENT_ID }).parentId?.value).toBe(PARENT_ID);
    });

    it('starts every collection empty', () => {
      const department = build();

      expect(department.questions).toEqual([]);
      expect(department.knowledgeChunks).toEqual([]);
      expect(department.subDepartments).toEqual([]);
      expect(department.parent).toBeUndefined();
    });

    // The backing field is optional but the getter coalesces, so this is never undefined.
    it('reports isExposedToTvContent as false when unset', () => {
      expect(build().isExposedToTvContent).toBe(false);
    });
  });

  describe('collection encapsulation', () => {
    it.each([
      ['questions', (d: Department) => d.questions],
      ['knowledgeChunks', (d: Department) => d.knowledgeChunks],
      ['subDepartments', (d: Department) => d.subDepartments],
    ])('hands out a copy of %s', (_label, read) => {
      const department = build();

      read(department).push({} as any);

      expect(read(department)).toEqual([]);
    });

    it('copies on assignment too, so the caller’s array is not aliased', () => {
      const department = build();
      const incoming: any[] = [{ id: UUID.create(SUB_ID) }];

      department.subDepartments = incoming as any;
      incoming.push({} as any);

      expect(department.subDepartments).toHaveLength(1);
    });
  });

  describe('sub-departments', () => {
    const buildSub = (id = SUB_ID) => Department.create({ id, name: 'Billing' });

    it('adds and finds by id', () => {
      const department = build();
      const sub = buildSub();

      department.addSubDepartment(sub);

      expect(department.findSubDepartmentById(UUID.create(SUB_ID))).toBe(sub);
    });

    it('returns undefined when the id is not present', () => {
      expect(
        build().findSubDepartmentById(UUID.create(PARENT_ID)),
      ).toBeUndefined();
    });

    it('removes by id', () => {
      const department = build();
      department.addSubDepartment(buildSub());

      department.removeSubDepartment(UUID.create(SUB_ID));

      expect(department.subDepartments).toEqual([]);
    });

    it('ignores a removal for an id it does not hold', () => {
      const department = build();
      department.addSubDepartment(buildSub());

      department.removeSubDepartment(UUID.create(PARENT_ID));

      expect(department.subDepartments).toHaveLength(1);
    });

    /**
     * Matching is by id *value*, not object identity, so a freshly constructed UUID with
     * the same string works — which is what every caller does.
     */
    it('matches on id value rather than instance', () => {
      const department = build();
      department.addSubDepartment(buildSub());

      department.removeSubDepartment(UUID.create(SUB_ID));

      expect(department.subDepartments).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('serialises ids as strings', () => {
      const json = build({ parentId: PARENT_ID }).toJSON();

      expect(json.id).toBe(DEPT_ID);
      expect(json.parentId).toBe(PARENT_ID);
      expect(typeof json.id).toBe('string');
    });

    it('omits parentId for a main department', () => {
      expect(build().toJSON().parentId).toBeUndefined();
    });

    it('recurses into the parent', () => {
      const parent = Department.create({ id: PARENT_ID, name: 'Ops' });
      const child = build({ parentId: PARENT_ID, parent });

      expect(child.toJSON().parent).toMatchObject({
        id: PARENT_ID,
        name: 'Ops',
      });
    });

    it('recurses into sub-departments', () => {
      const department = build();
      department.addSubDepartment(
        Department.create({ id: SUB_ID, name: 'Billing' }),
      );

      expect(department.toJSON().subDepartments).toEqual([
        expect.objectContaining({ id: SUB_ID, name: 'Billing' }),
      ]);
    });

    /**
     * Every nested map guards with `typeof x?.toJSON === 'function'`, so raw rows that
     * never became entities pass through untouched instead of throwing. The repositories
     * used to hand exactly that shape over, which is why the guard exists.
     */
    it('passes through collection members that are not entities', () => {
      const department = build();
      department.questions = [{ plain: 'object' } as any];

      expect(department.toJSON().questions).toEqual([{ plain: 'object' }]);
    });

    it('reports isExposedToTvContent as false rather than undefined', () => {
      expect(build().toJSON().isExposedToTvContent).toBe(false);
    });
  });
});
