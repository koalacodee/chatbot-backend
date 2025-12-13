import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import {
  Department,
  DepartmentVisibility,
} from '../../domain/entities/department.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DepartmentKnowledgeEvent } from '../../domain/events/department-knowledge.event';

interface CreateDepartmentDto {
  name: string;
  visibility?: DepartmentVisibility;
  knowledgeChunkContent?: string;
}

@Injectable()
export class CreateDepartmentUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateDepartmentDto): Promise<Department> {
    const department = Department.create({
      name: dto.name,
      visibility: dto.visibility,
    });
    const savedDept = await this.departmentRepo.save(department);
    if (dto.knowledgeChunkContent) {
      this.eventEmitter.emit(
        DepartmentKnowledgeEvent.name,
        new DepartmentKnowledgeEvent(
          savedDept.id.toString(),
          dto.knowledgeChunkContent,
        ),
      );
    }
    return savedDept;
  }
}
