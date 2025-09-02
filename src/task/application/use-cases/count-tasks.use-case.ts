import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class CountTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId?: string): Promise<number> {
    // For count operations, we need to get all tasks and count them
    // since the repository count() method doesn't support department filtering
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      const departmentIds = await this.getUserDepartmentIds(userId, userRole);
      
      // Get filtered tasks and count them
      const tasks = await this.taskRepo.findAll(undefined, undefined, departmentIds);
      return tasks.length;
    }
    
    return this.taskRepo.count();
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
