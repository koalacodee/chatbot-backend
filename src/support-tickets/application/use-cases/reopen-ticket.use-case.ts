import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupportTicketStatus } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface ReopenTicketInput {
  ticketId: string;
  userId?: string;
}
@Injectable()
export class ReopenTicketUseCase {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute({ ticketId, userId }: ReopenTicketInput) {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException({ ticket: 'not_found' });
    }

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      await this.checkDepartmentAccess(userId, ticket.departmentId.toString(), userRole);
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new BadRequestException({ticket: 'ticket_closed'})
    }

    ticket.status = SupportTicketStatus.SEEN;

    await this.ticketRepository.save(ticket);

    return null;
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
