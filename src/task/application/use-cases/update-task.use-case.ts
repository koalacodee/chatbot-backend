import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Task,
  TaskStatus,
  TaskAssignmentType,
} from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { User } from 'src/shared/entities/user.entity';
import { Roles } from 'src/shared/value-objects/role.vo';

interface UpdateTaskInputDto {
  title?: string;
  description?: string;
  departmentId?: string;
  assigneeId?: string;
  assignerId?: string;
  approverId?: string | null;
  status?: TaskStatus; // TaskStatus
  assignmentType?: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  notes?: string | null;
  feedback?: string | null;
}

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async execute(id: string, dto: UpdateTaskInputDto): Promise<Task> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId === null) {
        existing.assignee = undefined;
      } else {
        const user = await this.employeeRepository.findByUserId(dto.assigneeId);
        if (!user) throw new NotFoundException({ assigneeId: 'not_found' });
        existing.assignee = user;
      }
    }

    if (dto.assignerId !== undefined) {
      const user = await this.supervisorRepository.findByUserId(dto.assignerId);
      if (!user) throw new NotFoundException({ assignerId: 'not_found' });
      existing.assigner = user;
    }

    if (dto.targetDepartmentId !== undefined) {
      if (dto.targetDepartmentId === null) {
        existing.targetDepartment = undefined;
      } else {
        const dept = await this.departmentRepo.findById(dto.targetDepartmentId);
        if (!dept)
          throw new NotFoundException({ targetDepartmentId: 'not_found' });
        existing.targetDepartment = dept;
      }
    }

    if (dto.targetSubDepartmentId !== undefined) {
      if (dto.targetSubDepartmentId === null) {
        existing.targetSubDepartment = undefined;
      } else {
        const dept = await this.departmentRepo.findById(
          dto.targetSubDepartmentId,
        );
        if (!dept)
          throw new NotFoundException({ targetSubDepartmentId: 'not_found' });
        existing.targetSubDepartment = dept;
      }
    }

    if (dto.approverId !== undefined) {
      if (dto.approverId === null) {
        existing.approver = undefined;
      } else {
        const user = await this.userRepo.findById(dto.approverId);
        if (!user) throw new NotFoundException({ approverId: 'not_found' });
        existing.approver = await this.getApproverByUser(user);
      }
    }

    if (dto.assignmentType !== undefined)
      existing.assignmentType = dto.assignmentType;
    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.completedAt !== undefined)
      existing.completedAt = dto.completedAt ?? null;
    if (dto.notes !== undefined) existing.notes = dto.notes ?? undefined;
    if (dto.feedback !== undefined)
      existing.feedback = dto.feedback ?? undefined;

    return this.taskRepo.save(existing);
  }

  async getApproverByUser(user: User) {
    switch (user.role.getRole()) {
      case Roles.ADMIN:
        return this.adminRepository.findByUserId(user.id);
      case Roles.SUPERVISOR:
        return this.supervisorRepository.findByUserId(user.id);
      default:
        return null;
    }
  }
}
