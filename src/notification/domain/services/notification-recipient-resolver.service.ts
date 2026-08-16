import { Injectable } from '@nestjs/common';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { NotificationRecipient } from '../entities/notification-recipient.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';

@Injectable()
export class NotificationRecipientResolverService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
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
  ): Promise<string[]> {
    const recipients: string[] = [];

    switch (submissionType) {
      case 'SUPERVISOR_REVIEW':
        // Task submitted by employee, needs supervisor review
        if (assignedEmployeeId) {
          const reviewerUserId =
            await this.getEmployeeSupervisor(assignedEmployeeId);
          if (reviewerUserId) {
            recipients.push(reviewerUserId);
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
          const reviewerUserId =
            await this.getEmployeeSupervisor(assignedEmployeeId);
          if (reviewerUserId) {
            recipients.push(reviewerUserId);
          }
        }
        const allAdmins = await this.adminRepository.findAll();
        recipients.push(...allAdmins.map((admin) => admin.userId.toString()));
        break;
    }

    return [...new Set(recipients)]; // Remove duplicates
  }

  /**
   * Approved and rejected notify the same two people. Kept as one implementation so the
   * pair cannot drift; the public names stay separate because the events do.
   */
  private assigneeAndPerformer(
    assignedEmployeeId?: string,
    performerEmployeeId?: string,
  ): string[] {
    const recipients: string[] = [];

    if (assignedEmployeeId) {
      recipients.push(assignedEmployeeId);
    }

    if (performerEmployeeId && performerEmployeeId !== assignedEmployeeId) {
      recipients.push(performerEmployeeId);
    }

    return [...new Set(recipients)];
  }

  async resolveTaskApprovedRecipients(
    assignedEmployeeId?: string,
    performerEmployeeId?: string,
  ): Promise<string[]> {
    return this.assigneeAndPerformer(assignedEmployeeId, performerEmployeeId);
  }

  async resolveTaskRejectedRecipients(
    assignedEmployeeId?: string,
    performerEmployeeId?: string,
  ): Promise<string[]> {
    return this.assigneeAndPerformer(assignedEmployeeId, performerEmployeeId);
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
   * Employees assigned to a sub-department who can handle tickets.
   *
   * Scoped in the database. This used to call `findAll()` and filter in memory, so every
   * ticket creation loaded every employee in the system.
   */
  private async getEmployeesInSubDepartment(
    subDepartmentId: string,
  ): Promise<string[]> {
    const employees =
      await this.employeeRepository.findBySubDepartment(subDepartmentId);

    return employees
      .filter((employee) =>
        employee.permissions?.includes(EmployeePermissionsEnum.HANDLE_TICKETS),
      )
      .map((employee) => employee.userId.toString());
  }

  /**
   * Supervisors who reach the department directly or through its parent.
   *
   * The parent is resolved once and both ids handed to a single scoped query, replacing a
   * `findAll()` followed by one sequential `hasHierarchicalAccess` call per supervisor.
   */
  private async getSupervisorsWithDepartmentAccess(
    departmentId: string,
  ): Promise<string[]> {
    const department = await this.departmentRepository.findById(departmentId);
    const parentId = department?.parentId?.toString();

    const reachableFrom = parentId ? [departmentId, parentId] : [departmentId];

    const supervisors =
      await this.supervisorRepository.findByDepartmentIds(reachableFrom);

    return supervisors.map((supervisor) => supervisor.userId.toString());
  }

  /** Whether the department hangs off a parent. */
  private async isSubDepartment(departmentId: string): Promise<boolean> {
    const department = await this.departmentRepository.findById(departmentId);
    return department ? !!department.parentId : false;
  }

  /**
   * Employees reporting to any of the given supervisors who can handle tickets.
   *
   * Takes supervisor *user* ids, which is what the resolver passes around, so it maps
   * back to supervisor row ids before scoping the employee query.
   */
  private async getEmployeesUnderSupervisors(
    supervisorUserIds: string[],
  ): Promise<string[]> {
    if (supervisorUserIds.length === 0) {
      return [];
    }

    const supervisors = await Promise.all(
      supervisorUserIds.map((userId) =>
        this.supervisorRepository.findByUserId(userId),
      ),
    );

    const supervisorIds = supervisors
      .filter((supervisor) => supervisor !== null)
      .map((supervisor) => supervisor.id.toString());

    if (supervisorIds.length === 0) {
      return [];
    }

    const employees = await this.employeeRepository.findBySupervisorIds(
      supervisorIds,
      [EmployeePermissionsEnum.HANDLE_TICKETS],
    );

    return employees.map((employee) => employee.userId.toString());
  }
}
