import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DepartmentKnowledgeEvent } from 'src/department/domain/events/department-knowledge.event';
import { KnowledgeChunkProcessingService } from 'src/knowledge-chunks/domain/services/knowledge-chunk-processing.service';

@Injectable()
export class DepartmentKnowledgeEventListener {
  constructor(
    private readonly knowledgeChunkProcessingService: KnowledgeChunkProcessingService,
  ) {}

  private logger = new Logger(DepartmentKnowledgeEventListener.name);

  @OnEvent(DepartmentKnowledgeEvent.name)
  async handleEvent(event: DepartmentKnowledgeEvent) {
    this.logger.log(
      `Processing knowledge chunk for department ${event.departmentId}`,
    );
    await this.knowledgeChunkProcessingService.processKnowledgeChunk({
      content: event.content,
      departmentId: event.departmentId,
    });
    this.logger.log(
      `Knowledge chunk processed for department ${event.departmentId}`,
    );
  }
}
