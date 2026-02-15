import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';

export type AvailableDepartmentsResponse =
  | {
      role: 'admin';
      mainDepartments: Array<{
        id: string;
        name: string;
        subDepartments: Array<{ id: string; name: string }>;
      }>;
    }
  | {
      role: 'supervisor' | 'employee';
      departments: Array<{ id: string; name: string }>;
    };

@Injectable()
export class GetAvailableDepartmentsForMemberUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<AvailableDepartmentsResponse> {
    const user = await this.userRepository.findById(userId);
    const userRole = user.role.getRole();

    if (userRole === Roles.ADMIN) {
      const allDepartments =
        await this.departmentRepository.findAll({
          onlyExposedToTvContent: true,
        });
      const mainDepts = allDepartments.filter((d) => !d.parentId);
      const subDepts = allDepartments.filter((d) => d.parentId);

      const mainDepartments = mainDepts.map((main) => ({
        id: main.id.toString(),
        name: main.name,
        subDepartments: subDepts
          .filter(
            (sub) => sub.parentId?.toString() === main.id.toString(),
          )
          .map((sub) => ({
            id: sub.id.toString(),
            name: sub.name,
          })),
      }));

      return { role: 'admin', mainDepartments };
    }

    if (userRole === Roles.SUPERVISOR) {
      const depts =
        await this.departmentRepository.getSupervisorDepartments({
          supervisorIdOrUserId: { supervisorUserId: userId },
          fullDepartment: true,
          onlyExposedToTvContent: true,
        });
      const departments = depts.map((d) => ({
        id: d.id.toString(),
        name: d.name,
      }));
      return { role: 'supervisor', departments };
    }

    if (userRole === Roles.EMPLOYEE) {
      const subDepts =
        await this.departmentRepository.getEmployeeSubDepartments(
          { employeeUserId: userId },
          true,
          { onlyExposedToTvContent: true },
        );
      const departments = subDepts.map((d) => ({
        id: d.id.toString(),
        name: d.name,
      }));
      return { role: 'employee', departments };
    }

    return { role: 'employee', departments: [] };
  }
}
