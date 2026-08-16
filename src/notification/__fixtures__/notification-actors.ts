import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import {
  Employee,
  EmployeePermissionsEnum,
} from 'src/employee/domain/entities/employee.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';

/**
 * Stable uuids so a failure names a recognisable actor rather than a random hex blob.
 * The last two digits are the seed, which keeps them readable in assertion diffs.
 */
export const uid = (seed: number) =>
  `018f4a1e-1c7a-7000-8000-0000000000${seed.toString(16).padStart(2, '0')}`;

export const buildAdmin = (seed: number) =>
  Admin.create({ id: uid(seed), userId: uid(seed + 100) });

/** An admin's notification identity is its *user* id, not its admin row id. */
export const adminUserId = (seed: number) => uid(seed + 100);

export const buildDepartment = (seed: number, parentSeed?: number) =>
  Department.create({
    id: uid(seed),
    name: `dept-${seed}`,
    parentId: parentSeed === undefined ? undefined : uid(parentSeed),
  });

export const buildSupervisor = (
  seed: number,
  departmentSeeds: number[] = [],
) =>
  Supervisor.create({
    id: uid(seed),
    userId: uid(seed + 100),
    permissions: [],
    departments: departmentSeeds.map((d) => buildDepartment(d)),
  });

export const supervisorUserId = (seed: number) => uid(seed + 100);

/** `Employee.create` is async, so this builder is too. */
export const buildEmployee = async (
  seed: number,
  options: {
    supervisorSeed: number;
    subDepartmentSeeds?: number[];
    permissions?: EmployeePermissionsEnum[];
  },
) =>
  Employee.create({
    id: uid(seed),
    userId: uid(seed + 100),
    supervisorId: uid(options.supervisorSeed),
    permissions: options.permissions ?? [EmployeePermissionsEnum.HANDLE_TICKETS],
    subDepartments: (options.subDepartmentSeeds ?? []).map((d) =>
      buildDepartment(d),
    ),
  });

export const employeeUserId = (seed: number) => uid(seed + 100);
