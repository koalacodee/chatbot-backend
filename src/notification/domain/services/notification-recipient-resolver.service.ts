import { Injectable } from '@nestjs/common';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { NotificationRecipient } from '../entities/notification-recipient.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { DepartmentHierarchyService } from 'src/task/application/services/department-hierarchy.service';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

@Injectable()
export class NotificationRecipientResolverService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
  ) {}

  async resolveTicketCreatedRecipients(
    categoryId: string,
    subDepartmentId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    // Get all admins
    const admins = await this.adminRepository.findAll();
    recipients.push(...admins.map((admin) => admin.id.toString()));

    // Get supervisors whose departments have access to the ticket category
    const supervisorIds =
      await this.getSupervisorsWithDepartmentAccess(categoryId);
    recipients.push(...supervisorIds);

    // Get employees with handle_tickets permission whose assignedSubDepartmentIds match ticket.subDepartmentId
    if (subDepartmentId) {
      const subDepartmentEmployees =
        await this.getEmployeesInSubDepartment(subDepartmentId);
      const employeesWithPermission = await this.employeeRepository.findAll();
      const relevantEmployees = employeesWithPermission.filter(
        (employee) =>
          employee.permissions?.includes(
            EmployeePermissionsEnum.HANDLE_TICKETS,
          ) && subDepartmentEmployees.includes(employee.id.toString()),
      );
      recipients.push(
        ...relevantEmployees.map((employee) => employee.id.toString()),
      );
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTicketAssignedRecipients(
    assignedEmployeeId: string,
  ): Promise<string[]> {
    return [assignedEmployeeId];
  }

  async resolveTicketAssignedTeamRecipients(
    assignedEmployeeId: string,
  ): Promise<string[]> {
    const supervisorId = await this.getEmployeeSupervisor(assignedEmployeeId);
    return supervisorId ? [supervisorId] : [];
  }

  async resolveTicketReopenedRecipients(
    answeredByUserId: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    // Add the original answering user
    recipients.push(answeredByUserId);

    // Add all admins
    const admins = await this.adminRepository.findAll();
    recipients.push(...admins.map((admin) => admin.id.toString()));

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTaskCreatedRecipients(): Promise<string[]> {
    // Get all admins
    const admins = await this.adminRepository.findAll();
    return admins.map((admin) => admin.id.toString());
  }

  async resolveTaskCreatedSupervisorRecipients(
    categoryId: string,
  ): Promise<string[]> {
    // Get supervisors whose departments have access to the task category
    return await this.getSupervisorsWithDepartmentAccess(categoryId);
  }

  async resolveTaskCreatedEmployeeRecipients(
    assignedEmployeeId?: string,
    assignedSubDepartmentId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    if (assignedEmployeeId) {
      recipients.push(assignedEmployeeId);
    }

    if (assignedSubDepartmentId) {
      const subDepartmentEmployees = await this.getEmployeesInSubDepartment(
        assignedSubDepartmentId,
      );
      recipients.push(...subDepartmentEmployees);
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTaskSubmittedSupervisorRecipients(
    assignedEmployeeId: string,
  ): Promise<string[]> {
    const supervisorId = await this.getEmployeeSupervisor(assignedEmployeeId);
    return supervisorId ? [supervisorId] : [];
  }

  async resolveTaskSubmittedAdminRecipients(): Promise<string[]> {
    // Get all admins
    const admins = await this.adminRepository.findAll();
    return admins.map((admin) => admin.id.toString());
  }

  async resolveTaskApprovedRecipients(
    assignedEmployeeId: string,
  ): Promise<string[]> {
    return [assignedEmployeeId];
  }

  async resolveTaskRejectedRecipients(
    assignedEmployeeId: string,
  ): Promise<string[]> {
    return [assignedEmployeeId];
  }

  async resolveStaffRequestCreatedRecipients(): Promise<string[]> {
    // Get all admins
    const admins = await this.adminRepository.findAll();
    return admins.map((admin) => admin.id.toString());
  }

  async resolveStaffRequestResolvedRecipients(
    requestedBySupervisorId: string,
  ): Promise<string[]> {
    return [requestedBySupervisorId];
  }

  /**
   * Helper method to get the supervisor of an employee
   */
  private async getEmployeeSupervisor(
    employeeId: string,
  ): Promise<string | null> {
    const employee = await this.employeeRepository.findByUserId(employeeId);
    if (!employee || !employee.supervisorId) {
      return null;
    }

    const supervisor = await this.supervisorRepository.findById(
      employee.supervisorId.toString(),
    );
    return supervisor ? supervisor.id.toString() : null;
  }

  /**
   * Helper method to get employees in a specific sub-department
   */
  private async getEmployeesInSubDepartment(
    subDepartmentId: string,
  ): Promise<string[]> {
    const employees = await this.employeeRepository.findAll();
    const relevantEmployees = employees.filter((employee) =>
      employee.subDepartments?.some(
        (dept) => dept.id.toString() === subDepartmentId,
      ),
    );
    return relevantEmployees.map((employee) => employee.id.toString());
  }

  /**
   * Helper method to get supervisors with access to a department
   */
  private async getSupervisorsWithDepartmentAccess(
    departmentId: string,
  ): Promise<string[]> {
    const supervisors = await this.supervisorRepository.findAll();
    const relevantSupervisors = [];

    for (const supervisor of supervisors) {
      const supervisorDepartmentIds = supervisor.departments.map((dept) =>
        dept.id.toString(),
      );

      const hasAccess =
        await this.departmentHierarchyService.hasHierarchicalAccess(
          departmentId,
          supervisorDepartmentIds,
        );

      if (hasAccess) {
        relevantSupervisors.push(supervisor);
      }
    }

    return relevantSupervisors.map((supervisor) => supervisor.id.toString());
  }
}
