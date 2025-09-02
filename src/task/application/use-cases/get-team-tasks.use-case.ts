import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

export interface GetTeamTasksInput {
  employeeId?: string;
  subDepartmentId?: string;
  departmentId?: string;
  includeSubDepartmentTasks?: boolean;
  includeDepartmentTasks?: boolean;
  status?: string[];
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetTeamTasksUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: GetTeamTasksInput, userId?: string): Promise<Task[]> {
    const {
      employeeId,
      subDepartmentId,
      departmentId,
      status,
      offset,
      limit,
    } = input;

    // Apply department filtering if userId is provided
    let filteredInput = { ...input };
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      const userDepartmentIds = await this.getUserDepartmentIds(userId, userRole);
      
      // Filter department and subDepartment IDs based on user access
      if (userDepartmentIds.length > 0) {
        if (departmentId && !userDepartmentIds.includes(departmentId)) {
          return []; // User doesn't have access to this department
        }
        if (subDepartmentId && !userDepartmentIds.includes(subDepartmentId)) {
          return []; // User doesn't have access to this sub-department
        }
      }
    }

    // Use the new repository method for efficient database-level filtering
    return this.taskRepository.findTeamTasks({
      employeeId,
      subDepartmentId,
      departmentId,
      status,
      offset,
      limit,
    });
  }

  private async getUserDepartmentIds(userId: string, role: Roles): Promise<string[]> {
    if (role === Roles.ADMIN) {
      return []; // Admins see all tasks (no filtering)
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      return supervisor.departments.map((d) => d.id.toString());
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      return employee?.subDepartments.map((dep) => dep.id.toString()) ??
             employee?.supervisor?.departments.map((d) => d.id.toString()) ??
             [];
    }
    return [];
  }
}
