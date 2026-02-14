import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetDelegationUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    delegationId: string,
    userId: string,
  ): Promise<{
    delegation: TaskDelegation;
    attachments: FilehubAttachmentMessage[];
  }> {
    const delegation = await this.taskDelegationRepo.findById(delegationId);
    if (!delegation) {
      throw new NotFoundException({ delegationId: 'not_found' });
    }

    // Validate access
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    if (userRole !== Roles.ADMIN) {
      let hasAccess = false;

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        hasAccess = delegation.delegatorId === supervisor.id.toString();
      } else if (userRole === Roles.EMPLOYEE) {
        const employee = await this.employeeRepository.findByUserId(userId);
        hasAccess = delegation.assigneeId === employee?.id.toString();
      }

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have access to view this delegation',
        );
      }
    }

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: [delegationId],
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      delegation,
      attachments,
    };
  }
}
