import { Admin } from 'src/admin/domain/entities/admin.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import {
  Employee,
  EmployeePermissionsEnum,
} from 'src/employee/domain/entities/employee.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import {
  adminUserId,
  buildAdmin,
  buildDepartment,
  buildEmployee,
  buildSupervisor,
  employeeUserId,
  supervisorUserId,
  uid,
} from '../../__fixtures__/notification-actors';
import { NotificationRecipientResolverService } from './notification-recipient-resolver.service';

// Departments: 1 is a main department, 2 is a sub-department of 1, 3 is unrelated.
const MAIN = 1;
const SUB = 2;
const OTHER = 3;

interface Options {
  admins?: Admin[];
  supervisors?: Supervisor[];
  employees?: Employee[];
  departments?: Department[];
}

function build(options: Options = {}) {
  const departments = options.departments ?? [
    buildDepartment(MAIN),
    buildDepartment(SUB, MAIN),
    buildDepartment(OTHER),
  ];
  const byId = new Map(departments.map((d) => [d.id.value, d]));

  const admins = stubRepository<AdminRepository>('AdminRepository', {
    findAll: async () => options.admins ?? [],
  });

  const supervisors = stubRepository<SupervisorRepository>(
    'SupervisorRepository',
    {
      findAll: async () => options.supervisors ?? [],
      findById: async (id: string) =>
        (options.supervisors ?? []).find((s) => s.id.value === id) ?? null,
      findByUserId: async (userId: string) =>
        (options.supervisors ?? []).find((s) => s.userId.value === userId) ??
        null,
      // Scoped equivalent of the real query: supervisors owning any of these departments.
      findByDepartmentIds: async (departmentIds: string[]) =>
        (options.supervisors ?? []).filter((supervisor) =>
          supervisor.departments.some((d) =>
            departmentIds.includes(d.id.value),
          ),
        ),
    },
  );

  const employees = stubRepository<EmployeeRepository>('EmployeeRepository', {
    findByUserId: async (userId: string) =>
      (options.employees ?? []).find((e) => e.userId.value === userId) ?? null,
    findBySupervisorIds: async (
      supervisorIds: string[],
      permissions?: EmployeePermissionsEnum[],
    ) =>
      (options.employees ?? []).filter(
        (employee) =>
          supervisorIds.includes(employee.supervisorId.value) &&
          (!permissions?.length ||
            permissions.some((p) => employee.permissions?.includes(p))),
      ),
    findBySubDepartment: async (subDepartmentId: string) =>
      (options.employees ?? []).filter((employee) =>
        employee.subDepartments?.some((d) => d.id.value === subDepartmentId),
      ),
  });

  const departmentRepo = stubRepository<DepartmentRepository>(
    'DepartmentRepository',
    { findById: async (id: string) => byId.get(id) ?? null },
  );

  return new NotificationRecipientResolverService(
    admins,
    supervisors,
    employees,
    departmentRepo,
  );
}

describe('NotificationRecipientResolverService', () => {
  describe('resolveTicketCreatedRecipients', () => {
    it('always notifies every admin', async () => {
      const service = build({ admins: [buildAdmin(10), buildAdmin(11)] });

      await expect(
        service.resolveTicketCreatedRecipients(uid(MAIN)),
      ).resolves.toEqual([adminUserId(10), adminUserId(11)]);
    });

    it('notifies supervisors who own the department', async () => {
      const service = build({
        supervisors: [buildSupervisor(20, [MAIN]), buildSupervisor(21, [OTHER])],
      });

      const recipients = await service.resolveTicketCreatedRecipients(
        uid(MAIN),
      );

      expect(recipients).toContain(supervisorUserId(20));
      expect(recipients).not.toContain(supervisorUserId(21));
    });

    it('notifies supervisors who reach it through the parent', async () => {
      const service = build({ supervisors: [buildSupervisor(20, [MAIN])] });

      await expect(
        service.resolveTicketCreatedRecipients(uid(SUB)),
      ).resolves.toContain(supervisorUserId(20));
    });

    describe('employees under a notified supervisor', () => {
      it('are included when they can handle tickets', async () => {
        const service = build({
          supervisors: [buildSupervisor(20, [MAIN])],
          employees: [await buildEmployee(30, { supervisorSeed: 20 })],
        });

        await expect(
          service.resolveTicketCreatedRecipients(uid(MAIN)),
        ).resolves.toContain(employeeUserId(30));
      });

      /** HANDLE_TICKETS is the gate — other permissions do not qualify. */
      it('are excluded without HANDLE_TICKETS', async () => {
        const service = build({
          supervisors: [buildSupervisor(20, [MAIN])],
          employees: [
            await buildEmployee(30, {
              supervisorSeed: 20,
              permissions: [EmployeePermissionsEnum.HANDLE_TASKS],
            }),
          ],
        });

        await expect(
          service.resolveTicketCreatedRecipients(uid(MAIN)),
        ).resolves.not.toContain(employeeUserId(30));
      });

      it('are excluded when their supervisor was not notified', async () => {
        const service = build({
          supervisors: [buildSupervisor(21, [OTHER])],
          employees: [await buildEmployee(30, { supervisorSeed: 21 })],
        });

        await expect(
          service.resolveTicketCreatedRecipients(uid(MAIN)),
        ).resolves.toEqual([]);
      });
    });

    describe('sub-department employees', () => {
      it('are added when the ticket names a sub-department', async () => {
        const service = build({
          employees: [
            await buildEmployee(31, {
              supervisorSeed: 99,
              subDepartmentSeeds: [SUB],
            }),
          ],
        });

        await expect(
          service.resolveTicketCreatedRecipients(uid(MAIN), uid(SUB)),
        ).resolves.toContain(employeeUserId(31));
      });

      /**
       * The second argument is only honoured when it really is a sub-department — a main
       * department passed there is ignored rather than pulling in its members.
       */
      it('are not added when the id names a main department', async () => {
        const service = build({
          employees: [
            await buildEmployee(31, {
              supervisorSeed: 99,
              subDepartmentSeeds: [MAIN],
            }),
          ],
        });

        await expect(
          service.resolveTicketCreatedRecipients(uid(MAIN), uid(MAIN)),
        ).resolves.toEqual([]);
      });

      it('respect HANDLE_TICKETS too', async () => {
        const service = build({
          employees: [
            await buildEmployee(31, {
              supervisorSeed: 99,
              subDepartmentSeeds: [SUB],
              permissions: [EmployeePermissionsEnum.ADD_FAQS],
            }),
          ],
        });

        await expect(
          service.resolveTicketCreatedRecipients(uid(MAIN), uid(SUB)),
        ).resolves.toEqual([]);
      });
    });

    it('deduplicates a person reachable by two routes', async () => {
      // Employee 30 is both under the notified supervisor and in the sub-department.
      const service = build({
        supervisors: [buildSupervisor(20, [MAIN])],
        employees: [
          await buildEmployee(30, {
            supervisorSeed: 20,
            subDepartmentSeeds: [SUB],
          }),
        ],
      });

      const recipients = await service.resolveTicketCreatedRecipients(
        uid(MAIN),
        uid(SUB),
      );

      expect(recipients.filter((r) => r === employeeUserId(30))).toHaveLength(1);
    });

    it('returns an empty list when nobody qualifies', async () => {
      await expect(
        build().resolveTicketCreatedRecipients(uid(MAIN)),
      ).resolves.toEqual([]);
    });
  });

  describe('resolveTicketReopenedRecipients', () => {
    it('adds the original answerer to the ticket-created audience', async () => {
      const service = build({ admins: [buildAdmin(10)] });

      const recipients = await service.resolveTicketReopenedRecipients(
        uid(200),
        uid(MAIN),
      );

      expect(recipients).toEqual([uid(200), adminUserId(10)]);
    });

    it('does not list the answerer twice when they are also an admin', async () => {
      const service = build({ admins: [buildAdmin(10)] });

      const recipients = await service.resolveTicketReopenedRecipients(
        adminUserId(10),
        uid(MAIN),
      );

      expect(recipients).toEqual([adminUserId(10)]);
    });
  });

  describe('resolveTaskCreatedRecipients', () => {
    it('INDIVIDUAL notifies only the assignee', async () => {
      const service = build({ admins: [buildAdmin(10)] });

      await expect(
        service.resolveTaskCreatedRecipients('INDIVIDUAL', uid(300)),
      ).resolves.toEqual([uid(300)]);
    });

    /**
     * Reachable today: the v2 TaskCreatedEvent names this field `assigneeId`, so the
     * listener reads `assignedEmployeeId` as undefined and nobody is notified.
     */
    it('INDIVIDUAL notifies nobody when the assignee is missing', async () => {
      await expect(
        build().resolveTaskCreatedRecipients('INDIVIDUAL', undefined),
      ).resolves.toEqual([]);
    });

    it('DEPARTMENT notifies supervisors of that department only', async () => {
      const service = build({
        admins: [buildAdmin(10)],
        supervisors: [buildSupervisor(20, [MAIN]), buildSupervisor(21, [OTHER])],
        employees: [await buildEmployee(30, { supervisorSeed: 20 })],
      });

      const recipients = await service.resolveTaskCreatedRecipients(
        'DEPARTMENT',
        undefined,
        uid(MAIN),
      );

      // Admins and employees are deliberately not in the department-level audience.
      expect(recipients).toEqual([supervisorUserId(20)]);
    });

    it('DEPARTMENT notifies nobody without a target department', async () => {
      const service = build({ supervisors: [buildSupervisor(20, [MAIN])] });

      await expect(
        service.resolveTaskCreatedRecipients('DEPARTMENT'),
      ).resolves.toEqual([]);
    });

    describe('SUB_DEPARTMENT', () => {
      it('notifies the parent’s supervisors, their staff, and the sub-department staff', async () => {
        const service = build({
          supervisors: [buildSupervisor(20, [MAIN])],
          employees: [
            await buildEmployee(30, { supervisorSeed: 20 }),
            await buildEmployee(31, {
              supervisorSeed: 99,
              subDepartmentSeeds: [SUB],
            }),
          ],
        });

        const recipients = await service.resolveTaskCreatedRecipients(
          'SUB_DEPARTMENT',
          undefined,
          undefined,
          uid(SUB),
        );

        expect(recipients.sort()).toEqual(
          [
            supervisorUserId(20),
            employeeUserId(30),
            employeeUserId(31),
          ].sort(),
        );
      });

      /**
       * A sub-department with no parent still notifies its own staff — the parent branch
       * is skipped rather than aborting the whole resolution.
       */
      it('still notifies sub-department staff when the parent is missing', async () => {
        const service = build({
          departments: [buildDepartment(SUB)],
          supervisors: [buildSupervisor(20, [MAIN])],
          employees: [
            await buildEmployee(31, {
              supervisorSeed: 99,
              subDepartmentSeeds: [SUB],
            }),
          ],
        });

        await expect(
          service.resolveTaskCreatedRecipients(
            'SUB_DEPARTMENT',
            undefined,
            undefined,
            uid(SUB),
          ),
        ).resolves.toEqual([employeeUserId(31)]);
      });

      it('notifies nobody without a target sub-department', async () => {
        await expect(
          build().resolveTaskCreatedRecipients('SUB_DEPARTMENT'),
        ).resolves.toEqual([]);
      });
    });
  });

  describe('resolveTaskSubmittedRecipients', () => {
    const withEmployeeUnderSupervisor = async () =>
      build({
        admins: [buildAdmin(10)],
        supervisors: [buildSupervisor(20, [MAIN])],
        employees: [await buildEmployee(30, { supervisorSeed: 20 })],
      });

    it('SUPERVISOR_REVIEW notifies the employee’s supervisor', async () => {
      const service = await withEmployeeUnderSupervisor();

      await expect(
        service.resolveTaskSubmittedRecipients(
          'SUPERVISOR_REVIEW',
          employeeUserId(30),
        ),
      ).resolves.toEqual([supervisorUserId(20)]);
    });

    it('SUPERVISOR_REVIEW notifies nobody when the employee is unknown', async () => {
      const service = await withEmployeeUnderSupervisor();

      await expect(
        service.resolveTaskSubmittedRecipients('SUPERVISOR_REVIEW', uid(999)),
      ).resolves.toEqual([]);
    });

    it('ADMIN_REVIEW notifies every admin', async () => {
      const service = await withEmployeeUnderSupervisor();

      await expect(
        service.resolveTaskSubmittedRecipients('ADMIN_REVIEW'),
      ).resolves.toEqual([adminUserId(10)]);
    });

    it('SUPERVISOR_AND_ADMIN_REVIEW notifies both', async () => {
      const service = await withEmployeeUnderSupervisor();

      await expect(
        service.resolveTaskSubmittedRecipients(
          'SUPERVISOR_AND_ADMIN_REVIEW',
          employeeUserId(30),
        ),
      ).resolves.toEqual([supervisorUserId(20), adminUserId(10)]);
    });

    it('SUPERVISOR_AND_ADMIN_REVIEW still notifies admins without an employee', async () => {
      const service = await withEmployeeUnderSupervisor();

      await expect(
        service.resolveTaskSubmittedRecipients('SUPERVISOR_AND_ADMIN_REVIEW'),
      ).resolves.toEqual([adminUserId(10)]);
    });
  });

  /**
   * Approved and rejected are byte-identical implementations. Running both through the
   * same table keeps them that way — if one is changed alone, the other fails.
   */
  describe.each([
    ['approved', (s: NotificationRecipientResolverService) =>
      s.resolveTaskApprovedRecipients.bind(s)],
    ['rejected', (s: NotificationRecipientResolverService) =>
      s.resolveTaskRejectedRecipients.bind(s)],
  ])('resolveTask%sRecipients', (_label, pick) => {
    it('notifies the assignee', async () => {
      await expect(pick(build())(uid(300))).resolves.toEqual([uid(300)]);
    });

    it('notifies both when the performer differs', async () => {
      await expect(pick(build())(uid(300), uid(301))).resolves.toEqual([
        uid(300),
        uid(301),
      ]);
    });

    it('lists one entry when assignee and performer are the same person', async () => {
      await expect(pick(build())(uid(300), uid(300))).resolves.toEqual([
        uid(300),
      ]);
    });

    it('notifies the performer alone when there is no assignee', async () => {
      await expect(pick(build())(undefined, uid(301))).resolves.toEqual([
        uid(301),
      ]);
    });

    it('notifies nobody when neither is given', async () => {
      await expect(pick(build())()).resolves.toEqual([]);
    });
  });

  describe('staff requests', () => {
    it('created goes to every admin', async () => {
      const service = build({ admins: [buildAdmin(10), buildAdmin(11)] });

      await expect(
        service.resolveStaffRequestCreatedRecipients(),
      ).resolves.toEqual([adminUserId(10), adminUserId(11)]);
    });

    it('resolved goes back to the requesting supervisor', async () => {
      await expect(
        build().resolveStaffRequestResolvedRecipients(uid(400)),
      ).resolves.toEqual([uid(400)]);
    });
  });

  describe('resolveTicketAssignedRecipients', () => {
    it('returns the assignee unchanged', async () => {
      await expect(
        build().resolveTicketAssignedRecipients(uid(500)),
      ).resolves.toEqual([uid(500)]);
    });
  });
});
