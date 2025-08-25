import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface CreateQuestionDto {
  text: string;
  departmentId: string;
  knowledgeChunkId?: string;
  answer?: string;
  creatorId: string;
}

@Injectable()
export class CreateQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: CreateQuestionDto): Promise<Question> {
    // await this.accessControl.canAccessDepartment(
    //   dto.creatorId,
    //   dto.departmentId,
    // );

    const userRole = (
      await this.userRepository.findById(dto.creatorId)
    ).role.getRole();

    const question = Question.create({
      text: dto.text,
      departmentId: dto.departmentId,
      knowledgeChunkId: dto.knowledgeChunkId,
      answer: dto.answer,
      creatorEmployeeId:
        userRole === Roles.EMPLOYEE
          ? (
              await this.employeeRepository.findByUserId(dto.creatorId)
            ).id.toString()
          : undefined,
      creatorAdminId:
        userRole === Roles.ADMIN
          ? (
              await this.adminRepository.findByUserId(dto.creatorId)
            ).id.toString()
          : undefined,
      creatorSupervisorId:
        userRole === Roles.SUPERVISOR
          ? (
              await this.supervisorRepository.findByUserId(dto.creatorId)
            ).id.toString()
          : undefined,
    });
    return this.questionRepo.save(question);
  }
}
