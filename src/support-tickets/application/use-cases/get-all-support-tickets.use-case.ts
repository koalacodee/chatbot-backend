import { Injectable } from '@nestjs/common';
import {
  SupportTicketRepository,
  SupportTicketMetrics,
} from '../../domain/repositories/support-ticket.repository';
import { SupportTicketAnswerRepository } from '../../domain/repositories/support-ticket-answer.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GetAllSupportTicketsUseCase {
  constructor(
    private readonly supportTicketRepo: SupportTicketRepository,
    private readonly supportTicketAnswerRepo: SupportTicketAnswerRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    offset?: number,
    limit?: number,
    userId?: string,
  ): Promise<{
    tickets: any[];
    metrics: SupportTicketMetrics;
    attachments: { [ticketId: string]: string[] };
  }> {
    let departmentIds: string[] | undefined = undefined;

    // Get department access for the user if provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      departmentIds = await this.getUserDepartmentIds(userId, userRole);
    }

    // Get tickets and metrics in parallel
    const [toReturn, metrics] = await Promise.all([
      this.supportTicketRepo.findAll(offset, limit, departmentIds),
      this.supportTicketRepo.getMetrics(departmentIds),
    ]);

    const answers = await this.supportTicketAnswerRepo.findBySupportTicketIds(
      toReturn.map((t) => t.id.toString()),
    );

    const tickets = toReturn.map((ticket) => {
      const answer = answers.find(
        (a) => a.supportTicket.id.toString() === ticket.id.toString(),
      );
      return {
        ...ticket.toJSON(),
        answer: answer?.content,
      };
    });

    // Get attachments for tickets and their answers
    const ticketIds = toReturn.map((t) => t.id.toString());
    const answerIds = answers.map((a) => a.id.toString());
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [...ticketIds, ...answerIds],
    });

    return {
      tickets,
      metrics,
      attachments,
    };
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
