import { Injectable } from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetAllSupportTicketsUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly supportTicketAnswerRepo: SupportTicketAnswerRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(
    offset?: number,
    limit?: number,
    userId?: string,
  ): Promise<any[]> {
    let departmentIds: string[] | undefined = undefined;

    // Get department access for the user if provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      departmentIds = await this.getUserDepartmentIds(userId, userRole);
    }

    const toReturn = await this.supportTicketRepo.findAll(
      offset,
      limit,
      departmentIds,
    );
    const answers = await this.supportTicketAnswerRepo.findBySupportTicketIds(
      toReturn.map((t) => t.id.toString()),
    );

    console.log(toReturn);

    return toReturn.map((ticket) => {
      const answer = answers.find(
        (a) => a.supportTicket.id.toString() === ticket.id.toString(),
      );
      return {
        ...ticket.toJSON(),
        answer: answer?.content,
      };
    });
  }

  private async getUserDepartmentIds(
    userId: string,
    role: Roles,
  ): Promise<string[] | undefined> {
    if (role === Roles.ADMIN) {
      return undefined; // Admins see all tickets
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const mainDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Get all sub-departments for supervisor's main departments
      const allDepartmentIds = [...mainDepartmentIds];
      for (const deptId of mainDepartmentIds) {
        const subDepartments =
          await this.departmentRepository.findSubDepartmentByParentId(deptId);
        allDepartmentIds.push(
          ...subDepartments.map((sub) => sub.id.toString()),
        );
      }

      return allDepartmentIds;
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      return (
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        []
      );
    }
    return [];
  }
}
