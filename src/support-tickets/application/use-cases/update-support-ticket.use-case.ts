import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupportTicket } from '../../domain/entities/support-ticket.entity';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Roles } from 'src/shared/value-objects/role.vo';

interface UpdateSupportTicketInputDto {
  subject?: string;
  description?: string;
  departmentId?: string;
  status?: 'NEW' | 'SEEN' | 'ANSWERED' | 'CLOSED';
  userId?: string;
}

@Injectable()
export class UpdateSupportTicketUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(id: string, dto: UpdateSupportTicketInputDto): Promise<SupportTicket> {
    const existing = await this.supportTicketRepo.findById(id);
    if (!existing)
      throw new NotFoundException({ id: 'support_ticket_not_found' });

    // Check department access if userId is provided
    if (dto.userId) {
      const user = await this.userRepository.findById(dto.userId);
      const userRole = user.role.getRole();
      const departmentId = dto.departmentId || existing.departmentId.toString();
      await this.checkDepartmentAccess(dto.userId, departmentId, userRole);
    }

    if (dto.subject !== undefined) existing.subject = dto.subject;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.departmentId !== undefined)
      existing.departmentId = UUID.create(dto.departmentId);
    if (dto.status !== undefined) existing.status = dto.status as any;

    existing.updatedAt = new Date();

    return this.supportTicketRepo.save(existing);
  }

  private async checkDepartmentAccess(
    userId: string,
    departmentId: string,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all departments
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if supervisor has direct access to the department
      hasAccess = supervisorDepartmentIds.includes(departmentId);

      // If not direct access, check if it's a sub-department and supervisor has access to parent
      if (!hasAccess) {
        const department =
          await this.departmentRepository.findSubDepartmentById(departmentId, {
            includeParent: true,
          });
        if (department?.parent) {
          hasAccess = supervisorDepartmentIds.includes(
            department.parent.id.toString(),
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];
      hasAccess = employeeDepartmentIds.includes(departmentId);
    }

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this department');
    }
  }
}
