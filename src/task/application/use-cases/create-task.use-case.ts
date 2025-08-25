import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface CreateTaskInputDto {
  title: string;
  description: string;
  assigneeId?: string;
  assignerId: string;
  assignerRole: Roles;
  approverId?: string;
  status: any; // TaskStatus
  assignmentType: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  notes?: string;
  feedback?: string;
}

@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async execute(dto: CreateTaskInputDto): Promise<Task> {
    // Validate required fields based on assignment type
    const validationErrors: any = {};

    if (!dto.assignerId) validationErrors.assignerId = 'required';

    // Validate assignment type specific requirements
    switch (dto.assignmentType) {
      case 'INDIVIDUAL':
        if (!dto.assigneeId) validationErrors.assigneeId = 'required';
        break;
      case 'DEPARTMENT':
        if (!dto.targetDepartmentId)
          validationErrors.targetDepartmentId = 'required';
        break;
      case 'SUB_DEPARTMENT':
        if (!dto.targetSubDepartmentId)
          validationErrors.targetSubDepartmentId = 'required';
        break;
    }

    if (Object.keys(validationErrors).length > 0) {
      throw new BadRequestException(validationErrors);
    }

    const [
      assignee,
      assigner,
      approverAdmin,
      approverSupervisor,
      targetDepartment,
      targetSubDepartment,
    ] = await Promise.all([
      dto.assigneeId
        ? this.employeeRepository.findById(dto.assigneeId)
        : Promise.resolve(null),
      dto.assignerRole === Roles.ADMIN
        ? this.adminRepository.findByUserId(dto.assignerId)
        : this.supervisorRepository.findByUserId(dto.assignerId),
      dto.approverId
        ? this.adminRepository.findByUserId(dto.approverId)
        : Promise.resolve(null),
      dto.approverId
        ? this.supervisorRepository.findByUserId(dto.approverId)
        : Promise.resolve(null),
      dto.targetDepartmentId
        ? this.departmentRepo.findById(dto.targetDepartmentId)
        : Promise.resolve(null),
      dto.targetSubDepartmentId
        ? this.departmentRepo.findById(dto.targetSubDepartmentId)
        : Promise.resolve(null),
    ]);

    if (dto.assigneeId && !assignee)
      throw new NotFoundException({ assigneeId: 'not_found' });
    if (!assigner) throw new NotFoundException({ assignerId: 'not_found' });
    if (dto.approverId && !approverAdmin && !approverSupervisor)
      throw new NotFoundException({ approverId: 'not_found' });
    if (dto.targetDepartmentId && !targetDepartment)
      throw new NotFoundException({ targetDepartmentId: 'not_found' });
    if (dto.targetSubDepartmentId && !targetSubDepartment)
      throw new NotFoundException({ targetSubDepartmentId: 'not_found' });

    const task = Task.create({
      id: UUID.create().toString(),
      title: dto.title,
      description: dto.description,
      assignee: assignee ?? undefined,
      assigner: assigner,
      approver: approverAdmin ?? approverSupervisor,
      assignmentType: dto.assignmentType,
      targetDepartment: targetDepartment ?? undefined,
      targetSubDepartment: targetSubDepartment ?? undefined,
      status: dto.status,
      completedAt: dto.completedAt ?? undefined,
      notes: dto.notes ?? undefined,
      feedback: dto.feedback ?? undefined,
    });

    return this.taskRepo.save(task);
  }
}
