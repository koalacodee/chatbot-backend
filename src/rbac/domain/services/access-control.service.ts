import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

@Injectable()
export class AccessControlService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly departmentRepo: DepartmentRepository,
  ) {}

  async canAccessDepartment(
    userId: string,
    departmentId: string,
  ): Promise<true> {
    const [user, department] = await Promise.all([
      this.userRepo.findById(userId),
      this.departmentRepo.findById(departmentId),
    ]);

    if (!user) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    if (user.role.getRole() === 'MANAGER') {
      return true;
    }

    if (!department) {
      throw new NotFoundException({ department: 'department_not_found' });
    }

    if (user.departmentId !== department.id) {
      throw new ForbiddenException({
        department: 'forbidden_department_access',
      });
    }

    return true;
  }
}
