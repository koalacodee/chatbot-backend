import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskRepository } from '../../domain/repositories/task.repository';
import {
  Task,
  TaskAssignmentType,
  TaskPriority,
} from '../../domain/entities/task.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';

@Injectable()
export class PrismaTaskRepository extends TaskRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    super();
  }

  private async toDomain(row: any): Promise<Task> {
    const [
      assignee,
      assignerSupervisor,
      assignerAdmin,
      approverAdmin,
      approverSupervisor,
      targetDepartment,
      targetSubDepartment,
    ] = await Promise.all([
      row.assignee ? Employee.create(row.assignee) : undefined,
      row.assignerSupervisor
        ? this.supervisorRepository.findById(row.assignerSupervisor.id)
        : undefined,
      row.assignerAdmin
        ? this.adminRepository.findById(row.assignerAdmin.id)
        : undefined,
      row.approverAdmin
        ? this.adminRepository.findById(row.approverAdmin.id)
        : undefined,
      row.approverSupervisor
        ? this.supervisorRepository.findById(row.approverSupervisor.id)
        : undefined,
      row.targetDepartment
        ? Department.create(row.targetDepartment)
        : undefined,
      row.targetSubDepartment
        ? Department.create(row.targetSubDepartment)
        : undefined,
    ]);

    const assigner = assignerSupervisor ?? assignerAdmin;
    const approver = approverAdmin ?? approverSupervisor;

    if (!row.creatorId) {
      throw new Error('Task must have a creatorId');
    }

    return Task.create({
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: assignee,
      assigner: assigner,
      approver: approver,
      creatorId: row.creatorId,
      status: row.status,
      assignmentType: row.assignmentType as TaskAssignmentType,
      priority: row.priority as TaskPriority,
      targetDepartment: targetDepartment,
      targetSubDepartment: targetSubDepartment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
      // attachments handled separately via AttachmentRepository by targetId
      dueDate: row.dueDate,
      reminderInterval: row.reminderInterval ?? undefined,
      assigneeId: row.assigneeId ?? undefined,
      targetDepartmentId: row.targetDepartmentId ?? undefined,
      targetSubDepartmentId: row.targetSubDepartmentId ?? undefined,
    });
  }

  async save(task: Task): Promise<Task> {
    const data = {
      id: task.id.toString(),
      title: task.title,
      description: task.description,
      assigneeId: task.assignee?.id.toString() ?? null,
      assignerSupervisorId:
        task.assigner && 'supervisor' in task.assigner
          ? task.assigner.id.toString()
          : null,
      assignerAdminId:
        task.assigner && 'admin' in task.assigner
          ? task.assigner.id.toString()
          : null,
      creatorId: task.creatorId,
      status: task.status,
      assignmentType: task.assignmentType,
      priority: task.priority,
      targetDepartmentId: task.targetDepartment?.id.toString() ?? null,
      targetSubDepartmentId: task.targetSubDepartment?.id.toString() ?? null,
      createdAt: task.createdAt,
      updatedAt: new Date(),
      completedAt: task.completedAt ?? null,
      dueDate: task.dueDate,
      reminderInterval: task.reminderInterval ?? null,
    } as const;

    const upsert = await this.prisma.task.upsert({
      where: { id: data.id },
      update: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        assignerSupervisorId: data.assignerSupervisorId,
        assignerAdminId: data.assignerAdminId,
        creatorId: data.creatorId,
        status: data.status,
        assignmentType: data.assignmentType,
        priority: data.priority,
        targetDepartmentId: data.targetDepartmentId,
        targetSubDepartmentId: data.targetSubDepartmentId,
        updatedAt: data.updatedAt,
        dueDate: task.dueDate,
        completedAt: data.completedAt,
        reminderInterval: data.reminderInterval,
      },
      create: data,
      include: {
        assignee: true,
        assignerSupervisor: true,
        assignerAdmin: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
    });

    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<Task | null> {
    const row = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        assignerAdmin: true,
        assignerSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(
    offset?: number,
    limit?: number,
    departmentIds?: string[],
    start?: Date,
    end?: Date,
  ): Promise<Task[]> {
    const whereClause: any = {};

    if (departmentIds && departmentIds.length > 0) {
      whereClause.OR = [
        { targetDepartmentId: { in: departmentIds } },
        { targetSubDepartmentId: { in: departmentIds } },
        {
          assignee: { subDepartments: { some: { id: { in: departmentIds } } } },
        },
        {
          assignee: {
            supervisor: {
              departments: { some: { id: { in: departmentIds } } },
            },
          },
        },
      ];
    }

    if (start || end) {
      whereClause.createdAt = {};
      if (start) {
        whereClause.createdAt.gte = start;
      }
      if (end) {
        whereClause.createdAt.lte = end;
      }
    }

    const rows = await this.prisma.task.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: {
          include: {
            subDepartments: true,
            supervisor: {
              include: {
                departments: true,
              },
            },
          },
        },
        assignerAdmin: true,
        assignerSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<Task | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.task.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.task.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.task.count();
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        assigneeId,
        assignmentType: 'INDIVIDUAL',
      },
      include: {
        assignee: true,
        assignerAdmin: true,
        assignerSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByDepartment(departmentId: string): Promise<Task[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        OR: [
          { targetDepartmentId: departmentId },
          { targetSubDepartmentId: departmentId },
        ],
      },
      include: {
        assignee: true,
        assignerSupervisor: true,
        assignerAdmin: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByAssignmentType(
    assignmentType: string,
    targetId?: string,
  ): Promise<Task[]> {
    const whereClause: any = { assignmentType };

    if (targetId) {
      if (assignmentType === 'DEPARTMENT') {
        whereClause.targetDepartmentId = targetId;
      } else if (assignmentType === 'SUB_DEPARTMENT') {
        whereClause.targetSubDepartmentId = targetId;
      } else if (assignmentType === 'INDIVIDUAL') {
        whereClause.assigneeId = targetId;
      }
    }

    const rows = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: true,
        assignerAdmin: true,
        assignerSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findDepartmentLevelTasks(departmentId?: string): Promise<Task[]> {
    const whereClause: any = { assignmentType: 'DEPARTMENT' };

    if (departmentId) {
      whereClause.targetDepartmentId = departmentId;
    }

    const rows = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        assignerAdmin: true,
        assignerSupervisor: true,
        targetDepartment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findSubDepartmentLevelTasks(subDepartmentId?: string): Promise<Task[]> {
    const whereClause: any = { assignmentType: 'SUB_DEPARTMENT' };

    if (subDepartmentId) {
      whereClause.targetSubDepartmentId = subDepartmentId;
    }

    const rows = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        assignerAdmin: true,
        assignerSupervisor: true,
        targetSubDepartment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findSubIndividualsLevelTasks(individualId?: string): Promise<Task[]> {
    const whereClause: any = { assignmentType: 'INDIVIDUAL' };

    if (individualId) {
      whereClause.assigneeId = individualId;
    }

    const rows = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: { include: { user: true } },
        assignerAdmin: true,
        assignerSupervisor: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<Task[]> {
    const { employeeId, subDepartmentId, departmentId, status, offset, limit } =
      options;

    const whereClause: any = {};
    const orConditions: any[] = [];

    // Build OR conditions based on provided filters
    if (employeeId) {
      orConditions.push({
        assigneeId: employeeId,
        assignmentType: 'INDIVIDUAL',
      });
    }

    if (subDepartmentId) {
      orConditions.push({
        targetSubDepartmentId: subDepartmentId,
        assignmentType: 'SUB_DEPARTMENT',
      });
    }

    if (departmentId) {
      orConditions.push({
        targetDepartmentId: departmentId,
        assignmentType: 'DEPARTMENT',
      });
    }

    // If no specific filters provided, get all tasks
    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    // Add status filter if provided
    if (status && status.length > 0) {
      whereClause.status = { in: status };
    }

    const rows = await this.prisma.task.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: true,
        assignerAdmin: true,
        assignerSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
    });

    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const { supervisorDepartmentIds, status, offset, limit } = options;

    // Get all sub-department IDs under supervisor's departments
    const subDepartments = await this.prisma.department.findMany({
      where: { parentId: { in: supervisorDepartmentIds } },
      select: { id: true },
    });
    const subDepartmentIds = subDepartments.map((d) => d.id);

    // Combine all department IDs (main + sub-departments)
    const allDepartmentIds = [...supervisorDepartmentIds, ...subDepartmentIds];

    const whereClause: any = {
      OR: [
        { targetDepartmentId: { in: allDepartmentIds } },
        { targetSubDepartmentId: { in: allDepartmentIds } },
      ],
    };

    if (status && status.length > 0) {
      whereClause.status = { in: status };
    }

    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: true,
          assignerAdmin: true,
          assignerSupervisor: true,
          targetDepartment: true,
          targetSubDepartment: true,
        },
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    const tasks = await Promise.all(rows.map((r) => this.toDomain(r)));
    return { tasks, total };
  }

  async findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const {
      employeeId,
      supervisorId,
      subDepartmentIds,
      status,
      offset,
      limit,
    } = options;

    const whereClause: any = {
      OR: [
        // Tasks directly assigned to the employee
        { assigneeId: employeeId },
        // Tasks assigned by their supervisor
        { assignerSupervisorId: supervisorId },
        // Tasks assigned to their sub-departments
        { targetSubDepartmentId: { in: subDepartmentIds } },
      ],
    };

    if (status && status.length > 0) {
      whereClause.status = { in: status };
    }

    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: true,
          assignerAdmin: true,
          assignerSupervisor: true,
          targetDepartment: true,
          targetSubDepartment: true,
        },
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    const tasks = await Promise.all(rows.map((r) => this.toDomain(r)));
    return { tasks, total };
  }

  async getTaskMetricsForSupervisor(
    supervisorDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    const departmentIds = [...supervisorDepartmentIds];
    const subDepartments = await this.prisma.department.findMany({
      where: { parentId: { in: supervisorDepartmentIds } },
      select: { id: true },
    });
    departmentIds.push(...subDepartments.map((d) => d.id));

    return this.executeMetricsQuery(
      `t.target_department_id IN (SELECT department_id FROM department_hierarchy) OR t.target_sub_department_id IN (SELECT department_id FROM department_hierarchy)`,
      departmentIds,
      'department_hierarchy',
      'department_id',
    );
  }

  async getTaskMetricsForEmployee(
    employeeId: string,
    supervisorId: string,
    subDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    return this.executeMetricsQuery(
      `t.assignee_id = '${employeeId}'::uuid OR t.assigner_supervisor_id = '${supervisorId}'::uuid OR t.target_sub_department_id IN (SELECT sub_department_id FROM employee_access)`,
      subDepartmentIds,
      'employee_access',
      'sub_department_id',
    );
  }

  async getTaskMetricsForDepartment(departmentId?: string): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    if (!departmentId) {
      return this.executeMetricsQueryWithoutParameters(
        `t.assignment_type = 'department'`,
      );
    }

    return this.executeMetricsQuery(
      `t.assignment_type = 'department' AND t.target_department_id = '${departmentId}'::uuid`,
      [departmentId],
      'department_tasks',
      'department_id',
    );
  }

  async getTaskMetricsForSubDepartment(subDepartmentId?: string): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    if (!subDepartmentId) {
      return this.executeMetricsQueryWithoutParameters(
        `t.assignment_type = 'sub_department'`,
      );
    }

    return this.executeMetricsQuery(
      `t.assignment_type = 'sub_department' AND t.target_sub_department_id = '${subDepartmentId}'::uuid`,
      [subDepartmentId],
      'sub_department_tasks',
      'sub_department_id',
    );
  }

  async getTaskMetricsForIndividual(assigneeId?: string): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    if (!assigneeId) {
      return this.executeMetricsQueryWithoutParameters(
        `t.assignment_type = 'individual'`,
      );
    }

    return this.executeMetricsQuery(
      `t.assignment_type = 'individual' AND t.assignee_id = '${assigneeId}'::uuid`,
      [assigneeId],
      'individual_tasks',
      'assignee_id',
    );
  }

  private async executeMetricsQueryWithoutParameters(
    whereClause: string,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    const query = `
      WITH task_counts AS (
        SELECT 
          COUNT(CASE WHEN t.status IN ('to_do', 'seen', 'pending_review') THEN 1 END) as pending_count,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
        FROM tasks t
        WHERE ${whereClause}
      )
      SELECT 
        pending_count,
        completed_count,
        CASE 
          WHEN (pending_count + completed_count) > 0 
          THEN ROUND((completed_count::numeric / (pending_count + completed_count)) * 100)
          ELSE 0
        END as completion_percentage
      FROM task_counts
    `;

    const result = await this.prisma.$queryRawUnsafe<
      [
        {
          pending_count: bigint;
          completed_count: bigint;
          completion_percentage: number;
        },
      ]
    >(query);

    return {
      pendingCount: Number(result[0]?.pending_count || 0),
      completedCount: Number(result[0]?.completed_count || 0),
      completionPercentage: Number(result[0]?.completion_percentage || 0),
    };
  }

  private async executeMetricsQuery(
    whereClause: string,
    parameterArray: string[],
    parameterListName: string,
    parameterName: string,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    if (parameterArray.length === 0) {
      return {
        pendingCount: 0,
        completedCount: 0,
        completionPercentage: 0,
      };
    }

    const departmentIds = parameterArray.map((id) => `'${id}'`).join(',');

    const query = `
      WITH ${parameterListName} AS (
        SELECT unnest(ARRAY[${departmentIds}]::uuid[]) AS ${parameterName}
      ),
      task_counts AS (
        SELECT 
          COUNT(CASE WHEN t.status IN ('to_do', 'seen', 'pending_review') THEN 1 END) as pending_count,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
        FROM tasks t
        WHERE ${whereClause}
      )
      SELECT 
        pending_count,
        completed_count,
        CASE 
          WHEN (pending_count + completed_count) > 0 
          THEN ROUND((completed_count::numeric / (pending_count + completed_count)) * 100)
          ELSE 0
        END as completion_percentage
      FROM task_counts
    `;

    const result = await this.prisma.$queryRawUnsafe<
      [
        {
          pending_count: bigint;
          completed_count: bigint;
          completion_percentage: number;
        },
      ]
    >(query);

    return {
      pendingCount: Number(result[0]?.pending_count || 0),
      completedCount: Number(result[0]?.completed_count || 0),
      completionPercentage: Number(result[0]?.completion_percentage || 0),
    };
  }

  async findTaskForReminder(taskId: string): Promise<Task | null> {
    const row = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        status: {
          in: ['TODO'], // Only tasks that can receive reminders
        },
      },
      select: {
        id: true,
        title: true,
        assignmentType: true,
        assigneeId: true,
        targetDepartmentId: true,
        targetSubDepartmentId: true,
        createdAt: true,
        reminderInterval: true,
      },
    });

    if (!row) return null;

    return this.toDomain(row);
  }
}
