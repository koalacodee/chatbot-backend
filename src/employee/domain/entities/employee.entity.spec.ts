import { BadRequestException } from '@nestjs/common';
import { Department } from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Employee, EmployeePermissionsEnum } from './employee.entity';

const EMPLOYEE_ID = '018f4a1e-1c7a-7000-8000-000000000a01';
const USER_ID = '018f4a1e-1c7a-7000-8000-000000000a02';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000a03';

const build = (overrides = {}) =>
  Employee.create({
    id: EMPLOYEE_ID,
    userId: USER_ID,
    supervisorId: SUPERVISOR_ID,
    permissions: [EmployeePermissionsEnum.HANDLE_TICKETS],
    ...overrides,
  });

const userOptions = {
  id: USER_ID,
  name: 'Dana',
  email: 'dana@example.com',
  username: 'dana',
  password: 'plaintext-secret',
  role: Roles.EMPLOYEE,
};

describe('Employee', () => {
  describe('identity', () => {
    it('wraps all three ids as UUID value objects', async () => {
      const employee = await build();

      expect(employee.id.value).toBe(EMPLOYEE_ID);
      expect(employee.userId.value).toBe(USER_ID);
      expect(employee.supervisorId.value).toBe(SUPERVISOR_ID);
    });

    it('generates an id when none is supplied', async () => {
      const employee = await build({ id: undefined });

      expect(employee.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it.each([
      ['id', { id: 'nope' }],
      ['userId', { userId: 'nope' }],
      ['supervisorId', { supervisorId: 'nope' }],
    ])('rejects a malformed %s', async (_label, overrides) => {
      await expect(build(overrides)).rejects.toThrow(BadRequestException);
    });
  });

  describe('the polymorphic user argument', () => {
    /**
     * `create` accepts either a built `User` or raw `UserOptions`. The options branch
     * calls `User.create` with hashing left on — correct for a plaintext password from a
     * form, and wrong for an already-hashed column. Repositories must therefore pass a
     * `User` instance, which this branch hands straight through.
     */
    it('passes a User instance through untouched', async () => {
      const user = await User.create(
        { ...userOptions, password: 'already-a-hash' },
        false,
      );

      const employee = await build({ user });

      expect(employee.user).toBe(user);
    });

    it('builds a User from options, hashing the password', async () => {
      const employee = await build({ user: userOptions });

      expect(employee.user).toBeInstanceOf(User);
      expect(JSON.stringify(employee.user)).not.toContain('plaintext-secret');
    });

    it('leaves user undefined when none is given', async () => {
      expect((await build()).user).toBeUndefined();
    });
  });

  describe('permissions', () => {
    it('stores the list it was given', async () => {
      const employee = await build({
        permissions: [
          EmployeePermissionsEnum.HANDLE_TASKS,
          EmployeePermissionsEnum.ADD_FAQS,
        ],
      });

      expect(employee.permissions).toEqual([
        EmployeePermissionsEnum.HANDLE_TASKS,
        EmployeePermissionsEnum.ADD_FAQS,
      ]);
    });

    it('accepts an empty permission set', async () => {
      expect((await build({ permissions: [] })).permissions).toEqual([]);
    });

    /**
     * `permissions` is required by the props type but never defaulted, so an untyped
     * caller passing nothing leaves it undefined rather than empty — anything doing
     * `.includes()` on it would throw.
     */
    it('does not default a missing permission list', async () => {
      const employee = await build({ permissions: undefined });

      expect(employee.permissions).toBeUndefined();
    });

    it('is replaceable through the setter', async () => {
      const employee = await build();

      employee.permissions = [EmployeePermissionsEnum.CLOSE_TICKETS];

      expect(employee.permissions).toEqual([
        EmployeePermissionsEnum.CLOSE_TICKETS,
      ]);
    });
  });

  describe('relations', () => {
    it('defaults subDepartments to an empty array', async () => {
      expect((await build()).subDepartments).toEqual([]);
    });

    it('leaves the other relations undefined', async () => {
      const employee = await build();

      expect(employee.supervisor).toBeUndefined();
      expect(employee.assigneeTasks).toBeUndefined();
      expect(employee.questions).toBeUndefined();
      expect(employee.performerTasks).toBeUndefined();
      expect(employee.supportTicketAnswersAssigned).toBeUndefined();
      expect(employee.supportTicketAnswersAuthored).toBeUndefined();
    });

    // No defensive copying here — the getter returns the constructor's own array.
    it('exposes the very subDepartments array it was constructed with', async () => {
      const subDepartments: Department[] = [];
      const employee = await build({ subDepartments });

      subDepartments.push(Department.create({ name: 'Billing' }));

      expect(employee.subDepartments).toHaveLength(1);
    });
  });

  describe('toJSON', () => {
    it('emits ids as strings', async () => {
      const json = (await build()).toJSON();

      expect(json).toMatchObject({
        id: EMPLOYEE_ID,
        userId: USER_ID,
        supervisorId: SUPERVISOR_ID,
      });
    });

    it('strips the password from the nested user', async () => {
      const employee = await build({ user: userOptions });

      expect(JSON.stringify(employee.toJSON())).not.toContain(
        'plaintext-secret',
      );
    });

    it('survives an absent user', async () => {
      expect(() => (build() as any).then?.()).not.toThrow();
      await expect(build().then((e) => e.toJSON())).resolves.toBeDefined();
    });

    /**
     * Relations other than `user` are emitted as-is rather than serialised, so whatever
     * shape the repository attached is what a response carries.
     */
    it('passes relations through without serialising them', async () => {
      const subDepartments = [Department.create({ name: 'Billing' })];
      const json = (await build({ subDepartments })).toJSON();

      expect(json.subDepartments).toBe(subDepartments);
    });
  });

  describe('fromJSON', () => {
    it('round-trips the scalar fields', async () => {
      const employee = await Employee.fromJSON({
        id: EMPLOYEE_ID,
        userId: USER_ID,
        supervisorId: SUPERVISOR_ID,
        permissions: [EmployeePermissionsEnum.VIEW_ANALYTICS],
      });

      expect(employee.id.value).toBe(EMPLOYEE_ID);
      expect(employee.permissions).toEqual([
        EmployeePermissionsEnum.VIEW_ANALYTICS,
      ]);
    });
  });
});
