import { Injectable, ForbiddenException } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FaqCreatedEvent } from 'src/questions/domain/events/faq-created.event';
import { FilesService } from 'src/files/domain/services/files.service';

interface CreateQuestionDto {
  text: string;
  departmentId: string;
  knowledgeChunkId?: string;
  answer?: string;
  creatorId: string;
  attach?: boolean;
}

@Injectable()
export class CreateQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
  ) {}

  async execute(
    dto: CreateQuestionDto,
  ): Promise<{ question: Question; uploadKey: string }> {
    const user = await this.userRepository.findById(dto.creatorId);
    const userRole = user.role.getRole();
    // Check department access based on user role
    await this.checkDepartmentAccess(dto.creatorId, dto.departmentId, userRole);

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

    const [savedQuestion, uploadKey] = await Promise.all([
      this.questionRepo.save(question),
      dto.attach
        ? this.filesService.genUploadKey(question.id.toString())
        : undefined,
      this.eventEmitter.emitAsync(
        FaqCreatedEvent.name,
        new FaqCreatedEvent(
          question.text,
          question.id.toString(),
          dto.creatorId,
          new Date(),
        ),
      ),
    ]);

    return { question: savedQuestion, uploadKey };
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
          await this.departmentRepository.findById(departmentId);
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
