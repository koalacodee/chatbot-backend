import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { DepartmentHierarchyService } from '../services/department-hierarchy.service';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetMyTasksInputDto {
  userId: string;
  offset?: number;
  limit?: number;
  status?: string;
}

interface MyTasksResult {
  tasks: Task[];
  total: number;
  canSubmitWork: boolean[];
}

@Injectable()
export class GetMyTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
  ) {}

  async execute(dto: GetMyTasksInputDto): Promise<MyTasksResult> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userRole = user.role.getRole();

    switch (userRole) {
      case Roles.SUPERVISOR:
        return this.getSupervisorTasks(dto);
      case Roles.EMPLOYEE:
        return this.getEmployeeTasks(dto);
      case Roles.ADMIN:
        throw new ForbiddenException('Admins do not have my-tasks endpoint');
      default:
        throw new ForbiddenException('Invalid user role');
    }
  }

  private async getSupervisorTasks(
    dto: GetMyTasksInputDto,
  ): Promise<MyTasksResult> {
    const supervisor = await this.supervisorRepository.findByUserId(dto.userId);
    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    const supervisorDepartmentIds = supervisor.departments.map((d) =>
      d.id.toString(),
    );

    if (supervisorDepartmentIds.length === 0) {
      return { tasks: [], total: 0, canSubmitWork: [] };
    }

    const result = await this.taskRepo.findTasksForSupervisor({
      supervisorDepartmentIds,
      status: dto.status ? [dto.status] : undefined,
      offset: dto.offset,
      limit: dto.limit,
    });

    return {
      tasks: result.tasks,
      total: result.total,
      canSubmitWork: result.tasks.map(() => true), // Supervisors can submit work for their managed tasks
    };
  }

  private async getEmployeeTasks(
    dto: GetMyTasksInputDto,
  ): Promise<MyTasksResult> {
    const employee = await this.employeeRepository.findByUserId(dto.userId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const employeeSubDepartmentIds = employee.subDepartments.map((sd) =>
      sd.parentId.toString(),
    );

    const result = await this.taskRepo.findTasksForEmployee({
      employeeId: employee.id.toString(),
      supervisorId: employee.supervisor.id.toString(),
      subDepartmentIds: employeeSubDepartmentIds,
      status: dto.status ? [dto.status] : undefined,
      offset: dto.offset,
      limit: dto.limit,
    });

    return {
      tasks: result.tasks,
      total: result.total,
      canSubmitWork: result.tasks.map((task) => {
        const isAssignedToEmployee =
          task.assignee?.id.toString() === employee.id.toString();
        const isInSubDepartment =
          task.targetSubDepartment &&
          employeeSubDepartmentIds.includes(
            task.targetSubDepartment.id.toString(),
          );
        return isAssignedToEmployee || isInSubDepartment;
      }),
    };
  }
}
