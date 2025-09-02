import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  Employee,
  EmployeePermissionsEnum,
} from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';

@Injectable()
export class PrismaEmployeeRepository extends EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(prismaEmployee: any): Promise<Employee> {
    const subDepartments =
      prismaEmployee.subDepartments?.map((subDept: any) =>
        Department.create({
          id: subDept.department.id,
          name: subDept.department.name,
          visibility: subDept.department.visibility,
        }),
      ) || [];

    return Employee.fromJSON({
      id: prismaEmployee.id,
      userId: prismaEmployee.userId,
      user: await User.create(prismaEmployee.user),
      permissions: prismaEmployee.permissions,
      supervisorId: prismaEmployee.supervisorId,
      subDepartments: subDepartments,
      supervisor: Supervisor.create({
        ...prismaEmployee.supervisor,
        departments: prismaEmployee?.supervisor?.departments?.map(
          (dept) => Department.create,
        ),
      }),
    });
  }

  private toPrismaData(employee: Employee) {
    const json = employee.toJSON();
    return {
      id: json.id,
      userId: json.userId,
      permissions: json.permissions,
      supervisorId: json.supervisorId,
    } as const;
  }

  async save(employee: Employee): Promise<Employee> {
    const data = this.toPrismaData(employee);

    // Create or update employee
    const upsert = await this.prisma.employee.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });

    // Handle sub-departments
    const subDepartments = employee.subDepartments;
    if (subDepartments && subDepartments.length > 0) {
      // Delete existing sub-department assignments
      await this.prisma.employeeSubDepartment.deleteMany({
        where: { employeeId: data.id },
      });

      // Create new sub-department assignments
      const subDeptData = subDepartments.map((dept) => ({
        employeeId: data.id,
        departmentId: dept.id.toString(),
      }));

      await this.prisma.employeeSubDepartment.createMany({
        data: subDeptData,
        skipDuplicates: true,
      });
    }

    return this.findById(data.id);
  }

  async findById(id: string): Promise<Employee | null> {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        subDepartments: {
          include: {
            department: true,
          },
        },
        user: true,
        supervisor: { include: { departments: true } },
      },
    });
    return emp ? this.toDomain(emp) : null;
  }

  async findAll(): Promise<Employee[]> {
    const items = await this.prisma.employee.findMany({
      include: {
        subDepartments: {
          include: {
            department: true,
          },
        },
        user: true,
        supervisor: true,
      },
    });
    return Promise.all(items.map((e) => this.toDomain(e)));
  }

  async removeById(id: string): Promise<Employee | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.employee.delete({ where: { id } });
    return existing;
  }

  async findByIds(ids: string[]): Promise<Employee[]> {
    const items = await this.prisma.employee.findMany({
      where: { id: { in: ids } },
    });
    return Promise.all(items.map((e) => this.toDomain(e)));
  }

  async update(id: string, update: Partial<Employee>): Promise<Employee> {
    const data: any = {};
    if ((update as any)?.userId)
      data.userId =
        (update as any).userId.toString?.() ?? (update as any).userId;
    if ((update as any)?.supervisorId)
      data.supervisorId =
        (update as any).supervisorId.toString?.() ??
        (update as any).supervisorId;
    if ((update as any)?.permissions)
      data.permissions = (update as any).permissions;

    const updated = await this.prisma.employee.update({ where: { id }, data });

    // Handle sub-departments update if provided
    if (update.subDepartments) {
      const subDepartments = update.subDepartments;

      // Delete existing sub-department assignments
      await this.prisma.employeeSubDepartment.deleteMany({
        where: { employeeId: id },
      });

      // Create new sub-department assignments
      if (subDepartments && subDepartments.length > 0) {
        const subDeptData = subDepartments.map((dept) => ({
          employeeId: id,
          departmentId: dept.id.toString(),
        }));

        await this.prisma.employeeSubDepartment.createMany({
          data: subDeptData,
          skipDuplicates: true,
        });
      }
    }

    return this.findById(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.employee.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.employee.count();
  }

  async findByUserId(id: string): Promise<Employee | null> {
    const emp = await this.prisma.employee.findUnique({
      where: { userId: id },
      include: {
        subDepartments: {
          include: {
            department: true,
          },
        },
        user: true,
        supervisor: true,
      },
    });
    return emp ? this.toDomain(emp) : null;
  }

  async findBySubDepartment(id: string): Promise<Employee[]> {
    return this.prisma.employee
      .findMany({
        where: { subDepartments: { some: { departmentId: id } } },
        include: { user: true },
      })
      .then((vals) => Promise.all(vals.map(this.toDomain)));
  }

  async canDeleteEmployee(id: string): Promise<boolean> {
    // helper function to check if relation exists
    const hasRelation = async (promise: Promise<number>): Promise<boolean> =>
      (await promise) > 0;

    // sequential checks (stop at first relation found)
    if (
      await hasRelation(
        this.prisma.question.count({ where: { creatorEmployeeId: id } }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.supportTicketAnswer.count({
          where: { answererEmployeeId: id },
        }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.task.count({
          where: {
            assigneeId: id,
          },
        }),
      )
    )
      return false;

    return true; // no relations found
  }

  async findByPermissions(permissions: string[]): Promise<Employee[]> {
    const items = await this.prisma.employee.findMany({
      where: {
        permissions: {
          hasEvery: permissions as EmployeePermissionsEnum[],
        },
      },
      include: {
        subDepartments: {
          include: {
            department: true,
          },
        },
        user: true,
        supervisor: true,
      },
    });
    return Promise.all(items.map((e) => this.toDomain(e)));
  }

  async findByPermissionsAndDepartments(
    permissions: string[],
    departmentIds: string[],
  ): Promise<Employee[]> {
    const items = await this.prisma.employee.findMany({
      where: {
        permissions: {
          hasEvery: permissions as EmployeePermissionsEnum[],
        },
        subDepartments: {
          some: {
            departmentId: {
              in: departmentIds,
            },
          },
        },
      },
      include: {
        subDepartments: {
          include: {
            department: true,
          },
        },
        user: true,
        supervisor: true,
      },
    });
    return Promise.all(items.map((e) => this.toDomain(e)));
  }

  async validateEmployeeAssignmentPermission(
    employeeUserId: string,
    requiredPermissions: string[],
    supervisorDepartmentIds: string[],
  ): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: employeeUserId,
        permissions: {
          hasEvery: requiredPermissions as EmployeePermissionsEnum[],
        },
        subDepartments: {
          some: {
            departmentId: {
              in: supervisorDepartmentIds,
            },
          },
        },
      },
    });

    return !!employee;
  }

  async findBySupervisorId(supervisorId: string): Promise<Employee[]> {
    const items = await this.prisma.employee.findMany({
      where: {
        supervisorId: supervisorId,
      },
      include: {
        subDepartments: {
          include: {
            department: true,
          },
        },
        user: true,
        supervisor: true,
      },
    });
    return Promise.all(items.map((e) => this.toDomain(e)));
  }
}
