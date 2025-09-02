import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';

@Injectable()
export class PrismaTaskRepository extends TaskRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeRepository: EmployeeRepository,
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

    return Task.create({
      id: row.id,
      title: row.title,
      description: row.description,
      assignee: assignee,
      assigner: assigner,
      approver: approver,
      status: row.status,
      assignmentType: row.assignmentType as TaskAssignmentType,
      targetDepartment: targetDepartment,
      targetSubDepartment: targetSubDepartment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
      notes: row.assignerNotes ?? undefined,
      feedback: row.feedback ?? undefined,
      // attachments handled separately via AttachmentRepository by targetId
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
      approverAdminId:
        task.approver && 'admin' in task.approver
          ? task.approver.id.toString()
          : null,
      approverSupervisorId:
        task.approver && 'supervisor' in task.approver
          ? task.approver.id.toString()
          : null,
      status: task.status,
      assignmentType: task.assignmentType,
      targetDepartmentId: task.targetDepartment?.id.toString() ?? null,
      targetSubDepartmentId: task.targetSubDepartment?.id.toString() ?? null,
      createdAt: task.createdAt,
      updatedAt: new Date(),
      completedAt: task.completedAt ?? null,
      assignerNotes: task.notes ?? null,
      feedback: task.feedback ?? null,
    } as const;

    const upsert = await this.prisma.task.upsert({
      where: { id: data.id },
      update: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        assignerSupervisorId: data.assignerSupervisorId,
        assignerAdminId: data.assignerAdminId,
        approverAdminId: data.approverAdminId,
        approverSupervisorId: data.approverSupervisorId,
        status: data.status,
        assignmentType: data.assignmentType,
        targetDepartmentId: data.targetDepartmentId,
        targetSubDepartmentId: data.targetSubDepartmentId,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
        assignerNotes: data.assignerNotes,
        feedback: data.feedback,
      },
      create: data,
      include: {
        assignee: true,
        assignerSupervisor: true,
        assignerAdmin: true,
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number, departmentIds?: string[]): Promise<Task[]> {
    const whereClause: any = {};
    
    if (departmentIds && departmentIds.length > 0) {
      whereClause.OR = [
        { targetDepartmentId: { in: departmentIds } },
        { targetSubDepartmentId: { in: departmentIds } },
        { assignee: { subDepartments: { some: { id: { in: departmentIds } } } } },
        { assignee: { supervisor: { departments: { some: { id: { in: departmentIds } } } } } },
      ];
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
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
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
        approverAdmin: true,
        approverSupervisor: true,
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
    const {
      employeeId,
      subDepartmentId,
      departmentId,
      status,
      offset,
      limit,
    } = options;

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
        approverAdmin: true,
        approverSupervisor: true,
        targetDepartment: true,
        targetSubDepartment: true,
      },
    });

    return Promise.all(rows.map((r) => this.toDomain(r)));
  }
}
