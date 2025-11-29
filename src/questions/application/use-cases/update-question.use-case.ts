import { Injectable, ForbiddenException } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FaqUpdatedEvent } from '../listeners/faq-updated.listener';
import { FilesService } from 'src/files/domain/services/files.service';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import {
  SupportedLanguage,
  SupportedLanguageEnum,
} from 'src/translation/domain/services/translation.service';
import { TranslateEvent } from 'src/translation/domain/events/translate.event';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface UpdateQuestionDto {
  text?: string;
  departmentId?: string;
  knowledgeChunkId?: string;
  userId: string;
  answer?: string;
  attach?: boolean;
  deleteAttachments?: string[];
  chooseAttachments?: string[];
  translateTo?: SupportedLanguageEnum[];
}

@Injectable()
export class UpdateQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
    private readonly deleteAttachmentsUseCase: DeleteAttachmentsByIdsUseCase,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<{
    question: Question;
    uploadKey?: string;
    fileHubUploadKey?: string;
  }> {
    // Fetch the question to get departmentId
    const question = await this.questionRepo.findById(id);
    const departmentId = dto.departmentId || question.departmentId.value;

    // Check department access
    const user = await this.userRepository.findById(dto.userId);
    const userRole = user.role.getRole();
    await this.checkDepartmentAccess(dto.userId, departmentId, userRole);

    const update: any = { ...dto };
    if (dto.departmentId) update.departmentId = { value: dto.departmentId };
    if (dto.knowledgeChunkId)
      update.knowledgeChunkId = { value: dto.knowledgeChunkId };
    if (dto.answer) update.answer = dto.answer;
    if (dto.translateTo && dto.translateTo.length > 0) {
      const updateTranslationResult = await this.updateTranslations(
        question.availableLangs,
        dto.translateTo,
        question,
      );
      if (updateTranslationResult) {
        update.availableLangs = updateTranslationResult;
      }
    }

    // Handle attachment deletion if specified
    if (dto.deleteAttachments && dto.deleteAttachments.length > 0) {
      await this.deleteAttachmentsUseCase.execute({
        attachmentIds: dto.deleteAttachments,
      });
    }

    const [updatedQuestion, uploadKey, fileHubUploadKey] = await Promise.all([
      this.questionRepo.update(id, update),
      dto.attach ? this.filesService.genUploadKey(id, dto.userId) : undefined,
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: id,
              userId: dto.userId,
            })
            .then((upload) => upload.upload_key)
        : undefined,
      dto.chooseAttachments && dto.chooseAttachments.length > 0
        ? this.cloneAttachmentUseCase.execute({
            attachmentIds: dto.chooseAttachments,
            targetId: id,
          })
        : undefined,
    ]);

    this.eventEmitter.emit(
      FaqUpdatedEvent.name,
      new FaqUpdatedEvent(
        updatedQuestion.text,
        updatedQuestion.id.toString(),
        dto.userId,
        new Date(),
      ),
    );

    return { question: updatedQuestion, uploadKey, fileHubUploadKey };
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
          await this.departmentRepository.findSubDepartmentById(departmentId, {
            includeParent: true,
          });
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

  private arraysEqualUnique<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    for (const val of setA) {
      if (!setB.has(val)) return false;
    }
    return true;
  }

  private async updateTranslations(
    oldAvailableLangs: SupportedLanguage[],
    newAvailableLangs: SupportedLanguage[],
    question: Question,
  ): Promise<SupportedLanguage[] | undefined> {
    if (this.arraysEqualUnique(oldAvailableLangs, newAvailableLangs)) {
      return undefined;
    }

    const translationsToDelete = oldAvailableLangs.filter(
      (lang) => !newAvailableLangs.includes(lang),
    );
    const translationsToAdd = newAvailableLangs.filter(
      (lang) => !oldAvailableLangs.includes(lang),
    );

    await Promise.all(
      [
        this.eventEmitter.emitAsync(
          TranslateEvent.name,
          new TranslateEvent(
            question.text,
            question.id.toString(),
            translationsToAdd,
            'question',
          ),
        ),
        question.answer &&
          this.eventEmitter.emitAsync(
            TranslateEvent.name,
            new TranslateEvent(
              question.answer,
              question.id.toString(),
              translationsToAdd,
              'answer',
            ),
          ),
      ].filter(Boolean),
    );

    return newAvailableLangs;
  }
}
