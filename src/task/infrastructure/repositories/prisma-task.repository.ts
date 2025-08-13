import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';
import { Department } from 'src/department/domain/entities/department.entity';
import { User } from 'src/shared/entities/user.entity';

@Injectable()
export class PrismaTaskRepository extends TaskRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<Task> {
    const [assignee, assigner, approver] = await Promise.all([
      row.assignee ? User.create(row.assignee, false) : undefined,
      row.assigner ? User.create(row.assigner, false) : undefined,
      row.approver ? User.create(row.approver, false) : undefined,
    ]);

    return Task.create({
      id: row.id,
      title: row.title,
      description: row.description,
      department: Department.create(row.department),
      assignee: assignee!,
      assigner: assigner!,
      approver: approver,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt ?? undefined,
      notes: row.notes ?? undefined,
      feedback: row.feedback ?? undefined,
      // attachments handled separately via AttachmentRepository by targetId
    });
  }

  async save(task: Task): Promise<Task> {
    const data = {
      id: task.id.toString(),
      title: task.title,
      description: task.description,
      departmentId: task.department.id.toString(),
      assigneeId: task.assignee.id.toString(),
      assignerId: task.assigner.id.toString(),
      approverId: task.approver ? task.approver.id.toString() : null,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: new Date(),
      completedAt: task.completedAt ?? null,
      assignerNotes: task.notes ?? null,
      feedback: task.feedback ?? null,
    } as const;

    const upserted = await this.prisma.task.upsert({
      where: { id: data.id },
      update: {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
        assigneeId: data.assigneeId,
        assignerId: data.assignerId,
        approverId: data.approverId,
        status: data.status,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
        assignerNotes: data.assignerNotes,
        feedback: data.feedback,
      },
      create: data,
      include: {
        department: true,
        assignee: true,
        assigner: true,
        approver: true,
      },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Task | null> {
    const row = await this.prisma.task.findUnique({
      where: { id },
      include: {
        department: true,
        assignee: true,
        assigner: true,
        approver: true,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<Task[]> {
    const rows = await this.prisma.task.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        department: true,
        assignee: true,
        assigner: true,
        approver: true,
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
      where: { assigneeId },
      include: {
        department: true,
        assignee: true,
        assigner: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByDepartment(departmentId: string): Promise<Task[]> {
    const rows = await this.prisma.task.findMany({
      where: { departmentId },
      include: {
        department: true,
        assignee: true,
        assigner: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }
}
