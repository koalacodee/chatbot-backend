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
import { SupportTicketStatus } from '../../domain/entities/support-ticket.entity';
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
  ) { }

  async execute({
    offset,
    limit,
    userId,
    status,
    departmentId,
    search,
  }: {
    offset?: number;
    limit?: number;
    userId?: string;
    status?: SupportTicketStatus;
    departmentId?: string;
    search?: string;
  } = {}): Promise<{
    tickets: any[];
    metrics: SupportTicketMetrics;
    attachments: { [ticketId: string]: string[] };
  }> {
    let departmentIds: string[] | undefined;

    const normalizedSearch = search?.trim() || undefined;

    // Get department access for the user if provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      departmentIds = await this.getUserDepartmentIds(userId, userRole);
    }

    if (departmentId) {
      const departmentScopeIds =
        await this.getDepartmentWithChildren(departmentId);

      departmentIds = departmentIds
        ? departmentScopeIds.filter((id) => departmentIds!.includes(id))
        : departmentScopeIds;
    }

    if (departmentIds && departmentIds.length === 0) {
      return {
        tickets: [],
        metrics: {
          totalTickets: 0,
          pendingTickets: 0,
          answeredTickets: 0,
          closedTickets: 0,
        },
        attachments: {},
      };
    }

    // Get tickets and metrics in parallel
    const [toReturn, metrics] = await Promise.all([
      this.supportTicketRepo.findAll(
        offset,
        limit,
        departmentIds,
        undefined,
        undefined,
        status,
        normalizedSearch,
      ),
      this.supportTicketRepo.getMetrics(
        departmentIds,
        status,
        normalizedSearch,
      ),
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

  private async getDepartmentWithChildren(
    departmentId: string,
  ): Promise<string[]> {
    const toVisit = [departmentId];
    const visited = new Set<string>();

    while (toVisit.length > 0) {
      const current = toVisit.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      const children =
        await this.departmentRepository.findSubDepartmentByParentId(current);
      for (const child of children) {
        const childId = child.id.toString();
        if (!visited.has(childId)) {
          toVisit.push(childId);
        }
      }
    }

    return Array.from(visited);
  }
}
