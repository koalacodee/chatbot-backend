import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Department } from 'src/department/domain/entities/department.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';

/**
 * @deprecated This repository has been replaced by DrizzleTaskDelegationRepository.
 * Use DrizzleTaskDelegationRepository from './drizzle/drizzle-task-delegation.repository' instead.
 * This class will be removed in a future version.
 */
@Injectable()
export class PrismaTaskDelegationRepository extends TaskDelegationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskRepository: TaskRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {
    super();
  }

  private async toDomain(row: any): Promise<TaskDelegation> {
    const [task, targetSubDepartment, delegator, assignee] = await Promise.all([
      this.taskRepository.findById(row.taskId),
      row.targetSubDepartment
        ? Department.create(row.targetSubDepartment)
        : this.departmentRepository.findById(row.targetSubDepartmentId),
      row.delegator
        ? Supervisor.create(row.delegator)
        : this.supervisorRepository.findById(row.delegatorId),
      row.assigneeId
        ? this.employeeRepository.findById(row.assigneeId)
        : undefined,
    ]);

    if (!task) {
      throw new Error(`Task with id ${row.taskId} not found`);
    }

    if (!targetSubDepartment) {
      throw new Error(
        `Target sub-department with id ${row.targetSubDepartmentId} not found`,
      );
    }

    if (!delegator) {
      throw new Error(`Delegator with id ${row.delegatorId} not found`);
    }

    return TaskDelegation.create({
      id: row.id,
      taskId: row.taskId,
      task: task,
      assignee: assignee ?? undefined,
      assigneeId: row.assigneeId ?? undefined,
      targetSubDepartment: targetSubDepartment,
      targetSubDepartmentId: row.targetSubDepartmentId,
      delegator: delegator,
      delegatorId: row.delegatorId,
      status: row.status,
      assignmentType: row.assignmentType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
    });
  }

  async save(taskDelegation: TaskDelegation): Promise<TaskDelegation> {
    const data = {
      id: taskDelegation.id.toString(),
      taskId: taskDelegation.taskId.toString(),
      assigneeId: taskDelegation.assigneeId ?? null,
      targetSubDepartmentId: taskDelegation.targetSubDepartmentId.toString(),
      delegatorId: taskDelegation.delegatorId.toString(),
      status: taskDelegation.status,
      assignmentType: taskDelegation.assignmentType,
      createdAt: taskDelegation.createdAt,
      updatedAt: new Date(),
      completedAt: taskDelegation.completedAt ?? null,
    } as const;

    const upsert = await this.prisma.taskDelegation.upsert({
      where: { id: data.id },
      update: {
        taskId: data.taskId,
        assigneeId: data.assigneeId,
        targetSubDepartmentId: data.targetSubDepartmentId,
        delegatorId: data.delegatorId,
        status: data.status,
        assignmentType: data.assignmentType,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
      },
      create: data,
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<TaskDelegation | null> {
    const row = await this.prisma.taskDelegation.findUnique({
      where: { id },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { id: { in: ids } },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findAll(): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async removeById(id: string): Promise<TaskDelegation | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.prisma.taskDelegation.delete({
      where: { id },
    });

    return existing;
  }

  async removeByIds(ids: string[]): Promise<TaskDelegation[]> {
    const existing = await this.findByIds(ids);
    if (existing.length === 0) return [];

    await this.prisma.taskDelegation.deleteMany({
      where: { id: { in: ids } },
    });

    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.taskDelegation.count({
      where: { id },
    });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.taskDelegation.count();
  }

  async findByTaskId(taskId: string): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { taskId },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByTaskIds(taskIds: string[]): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { taskId: { in: taskIds } },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByAssigneeId(assigneeId: string): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { assigneeId },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByAssigneeIds(assigneeIds: string[]): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { assigneeId: { in: assigneeIds } },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByTargetSubDepartmentId(
    targetSubDepartmentId: string,
  ): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { targetSubDepartmentId },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByTargetSubDepartmentIds(
    targetSubDepartmentIds: string[],
  ): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { targetSubDepartmentId: { in: targetSubDepartmentIds } },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByDelegatorId(delegatorId: string): Promise<TaskDelegation[]> {
    const rows = await this.prisma.taskDelegation.findMany({
      where: { delegatorId },
      include: {
        task: true,
        assignee: true,
        targetSubDepartment: true,
        delegator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async findByDelegatorIdWithFilters(options: {
    delegatorId: string;
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ delegations: TaskDelegation[]; total: number }> {
    const { delegatorId, status, offset, limit } = options;

    const whereClause: any = {
      delegatorId,
    };

    if (status) {
      whereClause.status = status;
    }

    const [rows, total] = await Promise.all([
      this.prisma.taskDelegation.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        include: {
          task: true,
          assignee: true,
          targetSubDepartment: true,
          delegator: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taskDelegation.count({
        where: whereClause,
      }),
    ]);

    const delegations = await Promise.all(
      rows.map((row) => this.toDomain(row)),
    );

    return { delegations, total };
  }
}
