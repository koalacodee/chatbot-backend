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
        includeMainAsOption?: boolean;
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
      const mainDeptIds = new Set(mainDepts.map((m) => m.id.toString()));

      const orphanedParentIds = [
        ...new Set(
          subDepts
            .filter(
              (sub) =>
                sub.parentId &&
                !mainDeptIds.has(sub.parentId.toString()),
            )
            .map((sub) => sub.parentId!.toString()),
        ),
      ];

      let orphanParents: Awaited<
        ReturnType<DepartmentRepository['findByIds']>
      > = [];
      if (orphanedParentIds.length > 0) {
        orphanParents =
          await this.departmentRepository.findByIds(orphanedParentIds);
      }

      const exposedMains = mainDepts.map((main) => ({
        id: main.id.toString(),
        name: main.name,
        includeMainAsOption: true,
        subDepartments: subDepts
          .filter(
            (sub) => sub.parentId?.toString() === main.id.toString(),
          )
          .map((sub) => ({
            id: sub.id.toString(),
            name: sub.name,
          })),
      }));

      const orphanMainGroups = orphanParents.map((parent) => ({
        id: parent.id.toString(),
        name: parent.name,
        includeMainAsOption: false,
        subDepartments: subDepts
          .filter(
            (sub) => sub.parentId?.toString() === parent.id.toString(),
          )
          .map((sub) => ({
            id: sub.id.toString(),
            name: sub.name,
          })),
      }));

      const mainDepartments = [...exposedMains, ...orphanMainGroups];

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
