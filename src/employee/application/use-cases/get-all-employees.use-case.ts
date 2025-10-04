import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { GetUsersProfilePicturesUseCase } from 'src/profile/application/use-cases/get-users-profile-pictures.use-case';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetAllEmployeesUseCaseOutput {
  employees: any[];
}

@Injectable()
export class GetAllEmployeesUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly getUsersProfilePicturesUseCase: GetUsersProfilePicturesUseCase,
  ) {}

  async execute(userId?: string): Promise<GetAllEmployeesUseCaseOutput> {
    let employees: Employee[] = [];

    // Apply supervisor-based filtering
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);

        // Get employees that are directly supervised by this supervisor
        employees = await this.employeeRepository.findBySupervisorIds([
          supervisor.id.toString(),
        ]);
      } else if (userRole === Roles.ADMIN) {
        // Admins see all employees
        employees = await this.employeeRepository.findAll();
      } else {
        // Employees typically shouldn't access this endpoint, but if they do, show all for now
        employees = await this.employeeRepository.findAll();
      }
    } else {
      // No userId provided, return all employees
      employees = await this.employeeRepository.findAll();
    }

    // Get all user IDs from employees
    const userIds = employees.map((employee) => employee.userId.toString());

    // Fetch profile pictures for all users
    const { profilePictures } =
      await this.getUsersProfilePicturesUseCase.execute({ userIds });

    // Attach profile pictures to employees
    const employeesWithProfilePictures = employees.map((employee) => {
      const profilePicture = profilePictures.get(employee.userId.toString());
      return {
        ...employee.toJSON(),
        user: employee.user
          ? {
              ...employee.user.toJSON(),
              profilePicture: profilePicture
                ? profilePicture.toJSON().id
                : null,
            }
          : null,
      };
    });

    return { employees: employeesWithProfilePictures };
  }
}
