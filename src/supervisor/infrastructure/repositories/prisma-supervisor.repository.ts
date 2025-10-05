import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  Supervisor,
  SupervisorPermissionsEnum,
} from '../../domain/entities/supervisor.entity';
import {
  SupervisorRepository,
  SupervisorSummary,
} from '../../domain/repository/supervisor.repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { Task } from 'src/task/domain/entities/task.entity';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { Question } from 'src/questions/domain/entities/question.entity';
import { Promotion } from 'src/promotion/domain/entities/promotion.entity';
import { EmployeeRequest } from 'src/employee-request/domain/entities/employee-request.entity';
import { User } from 'src/shared/entities/user.entity';
import { AdminPermissions } from '@prisma/client';

@Injectable()
export class PrismaSupervisorRepository extends SupervisorRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(supervisor: any): Promise<Supervisor> {
    return Supervisor.create({
      id: supervisor?.id,
      userId: supervisor?.userId,
      user: supervisor.user ? await User.create(supervisor.user) : undefined,
      permissions: supervisor?.permissions || [],
      departments:
        supervisor?.departments?.map((dept: any) => Department.create(dept)) ||
        [],
      assignedTasks: supervisor?.assignerTasks?.map(Task.create) || [],
      employeeRequests:
        supervisor?.employeeRequests?.map(EmployeeRequest.create) || [],
      promotions: supervisor?.promotions?.map(Promotion.create) || [],
      approvedTasks: supervisor?.approvedTasks?.map(Task.create) || [],
      questions: supervisor?.questions?.map(Question.create) || [],
      supportTicketAnswersAuthored:
        supervisor?.supportTicketAnswersAuthored?.map(
          SupportTicketAnswer.create,
        ) || [],
      performedTasks: supervisor?.performerTasks?.map(Task.create) || [],
      createdAt: supervisor.createdAt,
      updatedAt: supervisor.updatedAt,
    });
  }

  async save(supervisor: Supervisor): Promise<Supervisor> {
    const data = supervisor.toPersistence();
    const savedSupervisor = await this.prisma.supervisor.upsert({
      where: { id: data.id },
      update: {
        permissions: data.permissions.map(
          (perm: SupervisorPermissionsEnum) => AdminPermissions[perm],
        ),
        user: { connect: { id: data.userId } },
        departments: {
          connect: data.departments.map((dept: Department) => ({
            id: dept.id.toString(),
          })),
        },
      },
      create: {
        id: data.id,
        permissions: data.permissions.map(
          (perm: SupervisorPermissionsEnum) => AdminPermissions[perm],
        ),
        user: { connect: { id: data.userId } },
        departments: {
          connect: data.departments.map((dept: any) => ({
            id: dept.id.toString(),
          })),
        },
      },
    });
    return this.toDomain(savedSupervisor);
  }

  async findById(id: string): Promise<Supervisor | null> {
    const supervisor = await this.prisma.supervisor.findUnique({
      where: { id },
      include: {
        departments: true,
        assignerTasks: true,
        employeeRequests: true,
        promotions: true,
        tasksReviewed: true,
        questions: true,
        supportTicketAnswersAuthored: true,
        tasksPerformed: true,
      },
    });
    return supervisor ? this.toDomain(supervisor) : null;
  }

  async findByUserId(userId: string): Promise<Supervisor | null> {
    const supervisor = await this.prisma.supervisor.findUnique({
      where: { userId },
      include: {
        departments: true,
        assignerTasks: true,
        employeeRequests: true,
        promotions: true,
        tasksReviewed: true,
        questions: true,
        supportTicketAnswersAuthored: true,
        tasksPerformed: true,
      },
    });
    return supervisor ? this.toDomain(supervisor) : null;
  }

  async findAll(): Promise<Supervisor[]> {
    const supervisors = await this.prisma.supervisor.findMany({
      include: {
        departments: true,
        assignerTasks: true,
        employeeRequests: true,
        promotions: true,
        tasksReviewed: true,
        questions: true,
        supportTicketAnswersAuthored: true,
        tasksPerformed: true,
      },
    });
    return Promise.all(supervisors.map((s) => this.toDomain(s)));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.supervisor.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.supervisor.count({ where: { id } });
    return count > 0;
  }

  async update(id: string, supervisor: Supervisor): Promise<void> {
    const data = supervisor.toPersistence();
    await this.prisma.supervisor.update({
      where: { id },
      data: {
        permissions: data.permissions.map(
          (perm: SupervisorPermissionsEnum) => AdminPermissions[perm],
        ),
        user: { connect: { id: data.userId } },
        departments: {
          connect: data.departments.map((dept: any) => ({
            id: dept.id.toString(),
          })),
        },
      },
    });
  }

  async count(): Promise<number> {
    return this.prisma.supervisor.count();
  }

  async findManyByDepartmentId(departmentId: string): Promise<Supervisor[]> {
    const supervisors = await this.prisma.supervisor.findMany({
      where: {
        departments: {
          some: {
            id: departmentId,
          },
        },
      },
      include: {
        departments: true,
        assignerTasks: true,
        employeeRequests: true,
        promotions: true,
        tasksReviewed: true,
        questions: true,
        supportTicketAnswersAuthored: true,
        tasksPerformed: true,
      },
    });
    return Promise.all(supervisors.map((s) => this.toDomain(s)));
  }

  async search(query: string): Promise<Supervisor[]> {
    const supervisors = await this.prisma.supervisor.findMany({
      where: {
        OR: [
          {
            user: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            user: {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            departments: {
              some: {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      include: {
        user: true,
        departments: true,
        assignerTasks: true,
        employeeRequests: true,
        promotions: true,
        tasksReviewed: true,
        questions: true,
        supportTicketAnswersAuthored: true,
        tasksPerformed: true,
      },
    });
    return Promise.all(supervisors.map((s) => this.toDomain(s)));
  }

  async canDelete(id: string): Promise<boolean> {
    const hasRelation = async (promise: Promise<number>): Promise<boolean> =>
      (await promise) > 0;

    // sequential checks (stop at first relation found)
    if (
      await hasRelation(
        this.prisma.question.count({ where: { departmentId: id } }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.knowledgeChunk.count({ where: { departmentId: id } }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.supportTicketAnswer.count({
          where: { answererSupervisorId: id },
        }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.employee.count({
          where: { supervisorId: id },
        }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.task.count({
          where: {
            OR: [{ assignerSupervisorId: id }],
          },
        }),
      )
    )
      return false;

    if (
      await hasRelation(
        this.prisma.taskSubmission.count({
          where: {
            OR: [{ performerSupervisorId: id }, { reviewedBySupervisorId: id }],
          },
        }),
      )
    )
      return false;

    return true; // no relations found
  }

  async getSupervisorSummaries(
    departmentIds?: string[],
  ): Promise<SupervisorSummary[]> {
    const supervisors = await this.prisma.user.findMany({
      where: {
        supervisor: {
          departments: { some: { id: { in: departmentIds } } },
        },
      },
      select: {
        id: true,
        name: true,
        profilePictures: true,
        username: true,
      },
    });
    return supervisors.map((supervisor) => ({
      id: supervisor.id,
      name: supervisor.name,
      profilePicture: supervisor.profilePictures?.id,
      username: supervisor.username,
    }));
  }
}
