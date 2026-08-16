import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';

/**
 * The metadata key is the entire contract between a decorator and its guard, and a guard
 * that cannot find its key admits the request. These were previously declared twice —
 * once in each decorator and again in its guard, with no import between them — so a
 * one-character divergence would have silently unguarded every route using that
 * decorator, with nothing failing to say so.
 *
 * This file exists to be the single declaration. It deliberately imports neither guards
 * nor decorators, so both sides can depend on it without a cycle.
 */
export const SUPERVISOR_PERMISSIONS_KEY = 'supervisor_permissions';
export const EMPLOYEE_PERMISSIONS_KEY = 'employee_permissions';
export const SUPERVISOR_OR_EMPLOYEE_PERMISSIONS_KEY =
  'supervisor_or_employee_permissions';

/**
 * A single permission, from either grant table.
 *
 * The two enums are not disjoint — `VIEW_ANALYTICS` and `MANAGE_ATTACHMENT_GROUPS`
 * appear in both — and `user.permissions` is a flat list of strings with nothing
 * recording which role granted each one. The guards therefore have to establish the
 * caller's role *before* consulting this list; matching the string alone lets an
 * employee's grant satisfy a supervisor requirement.
 */
export type Permission = EmployeePermissionsEnum | SupervisorPermissionsEnum;

/** Values a caller could hold under either grant, where the two enums overlap. */
export const SHARED_PERMISSIONS: readonly string[] = Object.values(
  EmployeePermissionsEnum,
).filter((value) =>
  (Object.values(SupervisorPermissionsEnum) as string[]).includes(value),
);
