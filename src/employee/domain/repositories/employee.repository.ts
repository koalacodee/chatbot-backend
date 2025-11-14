import { Employee, EmployeePermissionsEnum } from '../entities/employee.entity';

export abstract class EmployeeRepository {
  abstract save(employee: Employee): Promise<Employee>;
  abstract findById(id: string): Promise<Employee | null>;
  abstract findAll(): Promise<Employee[]>;
  abstract removeById(id: string): Promise<Employee | null>;

  abstract findByIds(ids: string[]): Promise<Employee[]>;
  abstract update(id: string, update: Partial<Employee>): Promise<Employee>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByUserId(id: string): Promise<Employee | null>;
  abstract findBySupervisorIds(
    supervisorIds: string[],
    permissions?: EmployeePermissionsEnum[],
  ): Promise<Employee[]>;
  abstract findBySubDepartment(id: string): Promise<Employee[]>;
  abstract canDeleteEmployee(id: string): Promise<boolean>;
  abstract findByPermissions(permissions: string[]): Promise<Employee[]>;
  abstract findByPermissionsAndDepartments(
    permissions: string[],
    departmentIds: string[],
  ): Promise<Employee[]>;
  abstract validateEmployeeAssignmentPermission(
    employeeUserId: string,
    requiredPermissions: string[],
    supervisorDepartmentIds: string[],
  ): Promise<boolean>;
  /**
   * Find all employees that a supervisor can delegate tasks to.
   * Returns employees that are either:
   * - Directly supervised by the supervisor, OR
   * - In a sub-department whose parent department is supervised by the supervisor
   * @param searchQuery Optional search query to filter by employee user's name, email, username, or employee ID
   */
  abstract findDelegableEmployees(
    supervisorId: string,
    supervisorDepartmentIds: string[],
    searchQuery?: string,
  ): Promise<Employee[]>;
}
