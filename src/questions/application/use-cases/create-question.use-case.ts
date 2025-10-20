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
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import {
  SupportedLanguage,
  SupportedLanguageEnum,
} from 'src/translation/domain/services/translation.service';
import { TranslateEvent } from 'src/translation/domain/events/translate.event';

interface CreateQuestionDto {
  text: string;
  departmentId: string;
  knowledgeChunkId?: string;
  answer?: string;
  creatorId: string;
  attach?: boolean;
  chooseAttachments?: string[];
  translateTo?: SupportedLanguageEnum[];
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
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
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

    const savedQuestion = await this.questionRepo.save(question);

    const translationPromises =
      dto.translateTo && dto.translateTo.length > 0
        ? Promise.all(
            [
              this.eventEmitter.emitAsync(
                TranslateEvent.name,
                new TranslateEvent(
                  savedQuestion.text,
                  savedQuestion.id.toString(),
                  dto.translateTo,
                  'question',
                ),
              ),
              savedQuestion.answer &&
                this.eventEmitter.emitAsync(
                  TranslateEvent.name,
                  new TranslateEvent(
                    savedQuestion.answer,
                    savedQuestion.id.toString(),
                    dto.translateTo,
                    'answer',
                  ),
                ),
            ].filter(Boolean),
          )
        : Promise.resolve(undefined);

    const [uploadKey] = await Promise.all([
      dto.attach
        ? this.filesService.genUploadKey(
            savedQuestion.id.toString(),
            dto.creatorId,
          )
        : undefined,
      this.eventEmitter.emitAsync(
        FaqCreatedEvent.name,
        new FaqCreatedEvent(
          savedQuestion.text,
          savedQuestion.id.toString(),
          dto.creatorId,
          new Date(),
        ),
      ),
      translationPromises,
    ]);

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: savedQuestion.id.toString(),
      });
    }

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
