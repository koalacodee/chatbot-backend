import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupportTicketRepository } from 'src/support-tickets/domain/repositories/support-ticket.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { TicketAssignedEvent } from '../../domain/events/ticket-assigned.event';

interface AssignTicketInput {
  ticketId: string;
  userId: string;
  currentUserId?: string;
}

@Injectable()
export class AssignTicketUseCase {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute({ ticketId, userId, currentUserId }: AssignTicketInput) {
    const [employee, ticket] = await Promise.all([
      this.employeeRepository.findByUserId(userId),
      this.ticketRepository.findById(ticketId),
    ]);

    if (!employee) {
      throw new NotFoundException({ employee: 'not_found' });
    }

    if (!ticket) {
      throw new NotFoundException({
        details: [{ field: 'ticketId', message: 'Ticket not found' }],
      });
    }

    // Check department access if currentUserId is provided
    if (currentUserId) {
      const user = await this.userRepository.findById(currentUserId);
      const userRole = user.role.getRole();

      // Check if current user has access to the ticket's department
      await this.checkDepartmentAccess(
        currentUserId,
        ticket.departmentId.toString(),
        userRole,
      );

      // Check if the employee being assigned is valid for the current user
      await this.checkEmployeeAssignmentPermission(
        currentUserId,
        employee,
        userRole,
      );
    }

    ticket.assignee = employee;

    await this.ticketRepository.save(ticket);

    // Emit ticket assigned event
    this.eventEmitter.emit(
      TicketAssignedEvent.name,
      new TicketAssignedEvent(
        ticket.id.toString(),
        ticket.subject,
        employee.userId.toString(),
        new Date(),
      ),
    );

    return null;
  }

  private async checkEmployeeAssignmentPermission(
    currentUserId: string,
    employee: any,
    currentUserRole: Roles,
  ): Promise<void> {
    // Admins can assign to any employee with HANDLE_TICKETS permission
    if (currentUserRole === Roles.ADMIN) {
      const hasPermission =
        await this.employeeRepository.validateEmployeeAssignmentPermission(
          employee.userId.toString(),
          [EmployeePermissionsEnum.HANDLE_TICKETS],
          [], // Empty array means no department restriction for admins
        );

      if (!hasPermission) {
        throw new ForbiddenException({
          details: [
            {
              field: 'employee',
              message: `Employee ${employee.user?.name || employee.id} does not have HANDLE_TICKETS permission`,
            },
          ],
        });
      }
      return;
    }

    // Only supervisors can assign tickets (employees cannot assign tickets)
    if (currentUserRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          { field: 'role', message: 'Only supervisors can assign tickets' },
        ],
      });
    }

    // Get supervisor's department access
    const supervisor =
      await this.supervisorRepository.findByUserId(currentUserId);
    const supervisorDepartmentIds = supervisor.departments.map((d) =>
      d.id.toString(),
    );

    // Get all sub-departments for supervisor's main departments
    const subDepartments =
      await this.departmentRepository.findAllSubDepartmentsByParentIds(
        supervisorDepartmentIds,
      );
    const allSupervisorDepartmentIds = [
      ...supervisorDepartmentIds,
      ...subDepartments.map((sub) => sub.id.toString()),
    ];

    // Validate employee assignment permission at database level
    const isValidAssignment =
      await this.employeeRepository.validateEmployeeAssignmentPermission(
        employee.userId.toString(),
        [EmployeePermissionsEnum.HANDLE_TICKETS],
        allSupervisorDepartmentIds,
      );

    if (!isValidAssignment) {
      throw new ForbiddenException({
        details: [
          {
            field: 'employee',
            message: `Employee ${employee.user?.name || employee.id} must have HANDLE_TICKETS permission and belong to one of your assigned departments`,
          },
        ],
      });
    }
  }

  private async checkDepartmentAccess(
    userId: string,
    departmentId: string,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return; // Admins have access to all departments
    }

    let userDepartmentIds: string[] = [];

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      userDepartmentIds = supervisor.departments.map((d) => d.id.toString());
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      userDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];
    }

    // Validate department access at database level
    const hasAccess = await this.departmentRepository.validateDepartmentAccess(
      departmentId,
      userDepartmentIds,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        details: [
          {
            field: 'departmentId',
            message: 'You do not have access to this department',
          },
        ],
      });
    }
  }
}
