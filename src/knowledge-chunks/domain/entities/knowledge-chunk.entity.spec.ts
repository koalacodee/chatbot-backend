import { Department } from 'src/department/domain/entities/department.entity';
import { Point } from 'src/shared/entities/point.entity';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { KnowledgeChunk } from './knowledge-chunk.entity';

const CHUNK_ID = '018f4a1e-1c7a-7000-8000-000000000e01';
const DEPT_ID = '018f4a1e-1c7a-7000-8000-000000000e02';
const POINT_ID = '018f4a1e-1c7a-7000-8000-000000000e03';

const buildPoint = (id?: string) =>
  Point.create({ id, vector: Vector.create({ dim: 2048 }) });

const buildDepartmentFor = (id: string) =>
  Department.create({ id, name: 'Support' });

const build = (overrides = {}) =>
  KnowledgeChunk.create({
    id: CHUNK_ID,
    content: 'Refunds take five days.',
    departmentId: DEPT_ID,
    ...overrides,
  });

describe('KnowledgeChunk', () => {
  describe('construction', () => {
    it('keeps a supplied id', () => {
      expect(build().id.value).toBe(CHUNK_ID);
    });

    it('generates an id when none is given', () => {
      expect(KnowledgeChunk.create({ content: 'x', departmentId: DEPT_ID }).id.value)
        .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('defaults department to null when only the id is known', () => {
      expect(build().department).toBeNull();
      expect(build().departmentId).toBe(DEPT_ID);
    });

    it('carries a department when one is supplied', () => {
      const department = Department.create({ id: DEPT_ID, name: 'Support' });

      expect(build({ department }).department).toBe(department);
    });

    it('leaves pointId null before the chunk is embedded', () => {
      expect(build().pointId).toBeUndefined();
    });
  });

  describe('point linkage', () => {
    it('updatePoint stores both the point and its id', () => {
      const chunk = build();
      const point = buildPoint(POINT_ID);

      chunk.updatePoint(point);

      expect(chunk.point).toBe(point);
      expect(chunk.pointId).toBe(POINT_ID);
    });

    /**
     * `updatePointId` deliberately clears the point object — the id is known but the
     * vector is not loaded, and keeping a stale point alongside a new id would let the
     * two disagree.
     */
    it('updatePointId drops the point object it can no longer vouch for', () => {
      const chunk = build();
      chunk.updatePoint(buildPoint(POINT_ID));

      chunk.updatePointId('018f4a1e-1c7a-7000-8000-000000000e09');

      expect(chunk.pointId).toBe('018f4a1e-1c7a-7000-8000-000000000e09');
      expect(chunk.point).toBeNull();
    });

    it('the point setter keeps id and object in step', () => {
      const chunk = build();
      const point = buildPoint(POINT_ID);

      chunk.point = point;

      expect(chunk.pointId).toBe(POINT_ID);
    });
  });

  describe('content and department updates', () => {
    it('updateContent replaces the text', () => {
      const chunk = build();

      chunk.updateContent('Refunds take three days.');

      expect(chunk.content).toBe('Refunds take three days.');
    });

    it('updateDepartment attaches a department', () => {
      const chunk = build();
      const department = Department.create({ id: DEPT_ID, name: 'Support' });

      chunk.updateDepartment(department);

      expect(chunk.department).toBe(department);
    });

    /**
     * The id and the object must not disagree: the repository persists `departmentId`, so
     * a move that only swapped the object would be written as a no-op. Mirrors what
     * `updatePoint` already does for points.
     */
    it('updateDepartment moves the id along with the object', () => {
      const chunk = build();
      const moved = Department.create({
        id: '018f4a1e-1c7a-7000-8000-0000000000ff',
        name: 'Billing',
      });

      chunk.updateDepartment(moved);

      expect(chunk.department?.id.value).toBe(
        '018f4a1e-1c7a-7000-8000-0000000000ff',
      );
      expect(chunk.departmentId).toBe('018f4a1e-1c7a-7000-8000-0000000000ff');
    });

    /**
     * The reverse direction, mirroring `updatePointId`: setting an id the loaded object
     * cannot vouch for detaches the object rather than letting the two drift.
     */
    it('setting a different departmentId detaches the stale object', () => {
      const department = buildDepartmentFor(DEPT_ID);
      const chunk = build({ department });

      chunk.departmentId = '018f4a1e-1c7a-7000-8000-0000000000ff';

      expect(chunk.department).toBeNull();
      expect(chunk.departmentId).toBe('018f4a1e-1c7a-7000-8000-0000000000ff');
    });

    it('setting the same departmentId keeps the object attached', () => {
      const department = buildDepartmentFor(DEPT_ID);
      const chunk = build({ department });

      chunk.departmentId = DEPT_ID;

      expect(chunk.department).toBe(department);
    });

    it('updateDepartment(null) detaches without clearing the id', () => {
      const department = Department.create({ id: DEPT_ID, name: 'Support' });
      const chunk = build({ department });

      chunk.updateDepartment(null);

      expect(chunk.department).toBeNull();
      expect(chunk.departmentId).toBe(DEPT_ID);
    });
  });

  describe('equals', () => {
    it('compares by id, ignoring content', () => {
      expect(build().equals(build({ content: 'different' }))).toBe(true);
    });

    it('is false for different ids', () => {
      const other = KnowledgeChunk.create({
        content: 'x',
        departmentId: DEPT_ID,
      });

      expect(build().equals(other)).toBe(false);
    });
  });


  describe('toJSON', () => {
    it('emits nulls rather than throwing for absent relations', () => {
      expect(build().toJSON()).toMatchObject({
        id: CHUNK_ID,
        content: 'Refunds take five days.',
        point: null,
        department: null,
        departmentId: DEPT_ID,
      });
    });

    it('nests the department when one is attached', () => {
      const department = Department.create({ id: DEPT_ID, name: 'Support' });

      expect(build({ department }).toJSON()).toMatchObject({
        department: expect.objectContaining({ id: DEPT_ID, name: 'Support' }),
      });
    });

    it('nests the point when one is attached', () => {
      const chunk = build();
      chunk.updatePoint(buildPoint(POINT_ID));

      expect(chunk.toJSON()).toMatchObject({
        pointId: POINT_ID,
        point: expect.objectContaining({ id: POINT_ID }),
      });
    });
  });
});
