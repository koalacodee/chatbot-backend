import { Injectable } from '@nestjs/common';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { NotificationRecipient } from '../entities/notification-recipient.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { DepartmentHierarchyService } from 'src/department/application/services/department-hierarchy.service';
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

    // 1. Get all admins
    const admins = await this.adminRepository.findAll();
    recipients.push(...admins.map((admin) => admin.userId.toString()));

    // 2. Get supervisors whose departments have access to the ticket category or its sub-departments
    const supervisorIds =
      await this.getSupervisorsWithDepartmentAccess(categoryId);
    recipients.push(...supervisorIds);

    // 3. Always get employees under notified supervisors (with HANDLE_TICKETS permission)
    const employeesUnderNotifiedSupervisors =
      await this.getEmployeesUnderSupervisors(supervisorIds);
    recipients.push(...employeesUnderNotifiedSupervisors);

    // 4. If subDepartmentId is provided and it's a sub-department, also get employees assigned to this sub-department (with HANDLE_TICKETS permission)
    if (subDepartmentId) {
      const isSubDepartment = await this.isSubDepartment(subDepartmentId);

      if (isSubDepartment) {
        const subDepartmentEmployees =
          await this.getEmployeesInSubDepartment(subDepartmentId);
        recipients.push(...subDepartmentEmployees);
      }
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTicketAssignedRecipients(
    assignedEmployeeId: string,
  ): Promise<string[]> {
    // assignedEmployeeId is already a userId, so we can return it directly
    return [assignedEmployeeId];
  }

  async resolveTicketReopenedRecipients(
    answeredByUserId: string,
    departmentId: string,
    subDepartmentId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    // Add the original answering user
    recipients.push(answeredByUserId);

    // Use the same logic as ticket creation for department-based notifications
    const ticketCreatedRecipients = await this.resolveTicketCreatedRecipients(
      departmentId,
      subDepartmentId,
    );
    recipients.push(...ticketCreatedRecipients);

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTaskCreatedRecipients(
    assignmentType: 'INDIVIDUAL' | 'DEPARTMENT' | 'SUB_DEPARTMENT',
    assignedEmployeeId?: string,
    targetDepartmentId?: string,
    targetSubDepartmentId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    switch (assignmentType) {
      case 'INDIVIDUAL':
        // Individual assignee: notify that assignee only (employee)
        if (assignedEmployeeId) {
          recipients.push(assignedEmployeeId);
        }
        break;

      case 'DEPARTMENT':
        // Main department: Notify the Supervisors that supervise this main department
        if (targetDepartmentId) {
          const supervisorIds =
            await this.getSupervisorsWithDepartmentAccess(targetDepartmentId);
          recipients.push(...supervisorIds);
        }
        break;

      case 'SUB_DEPARTMENT':
        // Sub-department: notify the supervisor that supervise this department's Parent,
        // the employees under these supervisors, and the employees under the sub-department
        if (targetSubDepartmentId) {
          // Get the parent department of the sub-department
          const subDepartment = await this.departmentRepository.findById(
            targetSubDepartmentId,
          );
          if (subDepartment && subDepartment.parentId) {
            const parentDepartmentId = subDepartment.parentId.toString();

            // Get supervisors that supervise the parent department
            const supervisorIds =
              await this.getSupervisorsWithDepartmentAccess(parentDepartmentId);
            recipients.push(...supervisorIds);

            // Get employees under these supervisors (with HANDLE_TICKETS permission)
            const employeesUnderSupervisors =
              await this.getEmployeesUnderSupervisors(supervisorIds);
            recipients.push(...employeesUnderSupervisors);
          }

          // Get employees assigned to this sub-department (with HANDLE_TICKETS permission)
          const subDepartmentEmployees = await this.getEmployeesInSubDepartment(
            targetSubDepartmentId,
          );
          recipients.push(...subDepartmentEmployees);
        }
        break;
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTaskSubmittedRecipients(
    submissionType:
      | 'SUPERVISOR_REVIEW'
      | 'ADMIN_REVIEW'
      | 'SUPERVISOR_AND_ADMIN_REVIEW',
    assignedEmployeeId?: string,
    supervisorId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    switch (submissionType) {
      case 'SUPERVISOR_REVIEW':
        // Task submitted by employee, needs supervisor review
        if (assignedEmployeeId) {
          const supervisorId =
            await this.getEmployeeSupervisor(assignedEmployeeId);
          if (supervisorId) {
            recipients.push(supervisorId);
          }
        }
        break;

      case 'ADMIN_REVIEW':
        // Task submitted by supervisor, needs admin review
        const admins = await this.adminRepository.findAll();
        recipients.push(...admins.map((admin) => admin.userId.toString()));
        break;

      case 'SUPERVISOR_AND_ADMIN_REVIEW':
        // Both supervisors and admins can resolve
        if (assignedEmployeeId) {
          const supervisorId =
            await this.getEmployeeSupervisor(assignedEmployeeId);
          if (supervisorId) {
            recipients.push(supervisorId);
          }
        }
        const allAdmins = await this.adminRepository.findAll();
        recipients.push(...allAdmins.map((admin) => admin.userId.toString()));
        break;
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTaskApprovedRecipients(
    assignedEmployeeId?: string,
    performerEmployeeId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    // Notify the assigned employee
    if (assignedEmployeeId) {
      recipients.push(assignedEmployeeId);
    }

    // Notify the performer employee (if different from assignee)
    if (performerEmployeeId && performerEmployeeId !== assignedEmployeeId) {
      recipients.push(performerEmployeeId);
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveTaskRejectedRecipients(
    assignedEmployeeId?: string,
    performerEmployeeId?: string,
  ): Promise<string[]> {
    const recipients: string[] = [];

    // Notify the assigned employee
    if (assignedEmployeeId) {
      recipients.push(assignedEmployeeId);
    }

    // Notify the performer employee (if different from assignee)
    if (performerEmployeeId && performerEmployeeId !== assignedEmployeeId) {
      recipients.push(performerEmployeeId);
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  async resolveStaffRequestCreatedRecipients(): Promise<string[]> {
    // Get all admins
    const admins = await this.adminRepository.findAll();
    return admins.map((admin) => admin.userId.toString());
  }

  async resolveStaffRequestResolvedRecipients(
    requestedBySupervisorId: string,
  ): Promise<string[]> {
    // requestedBySupervisorId is already a userId
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
    return supervisor ? supervisor.userId.toString() : null;
  }

  /**
   * Helper method to get employees in a specific sub-department (with HANDLE_TICKETS permission)
   */
  private async getEmployeesInSubDepartment(
    subDepartmentId: string,
  ): Promise<string[]> {
    const employees = await this.employeeRepository.findAll();
    const relevantEmployees = employees.filter(
      (employee) =>
        employee.subDepartments?.some(
          (dept) => dept.id.toString() === subDepartmentId,
        ) &&
        employee.permissions?.includes(EmployeePermissionsEnum.HANDLE_TICKETS),
    );
    return relevantEmployees.map((employee) => employee.userId.toString());
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

    return relevantSupervisors.map((supervisor) =>
      supervisor.userId.toString(),
    );
  }

  /**
   * Helper method to check if a department is a sub-department
   */
  private async isSubDepartment(departmentId: string): Promise<boolean> {
    const department = await this.departmentRepository.findById(departmentId);
    return department ? !!department.parentId : false;
  }

  /**
   * Helper method to get employees assigned under specific supervisors (with HANDLE_TICKETS permission)
   */
  private async getEmployeesUnderSupervisors(
    supervisorUserIds: string[],
  ): Promise<string[]> {
    if (supervisorUserIds.length === 0) {
      return [];
    }

    // Get supervisor entities by user IDs
    const supervisors = await this.supervisorRepository.findAll();
    const relevantSupervisors = supervisors.filter((supervisor) =>
      supervisorUserIds.includes(supervisor.userId.toString()),
    );

    // Get all employees and filter by supervisor assignment and HANDLE_TICKETS permission
    const employees = await this.employeeRepository.findAll();
    const relevantEmployees = employees.filter((employee) => {
      if (!employee.supervisorId) return false;

      return (
        relevantSupervisors.some(
          (supervisor) =>
            supervisor.id.toString() === employee.supervisorId.toString(),
        ) &&
        employee.permissions?.includes(EmployeePermissionsEnum.HANDLE_TICKETS)
      );
    });

    return relevantEmployees.map((employee) => employee.userId.toString());
  }
}
