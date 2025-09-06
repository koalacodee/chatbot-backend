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
}
