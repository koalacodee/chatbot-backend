import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { KnowledgeChunkProcessingService } from "../../domain/services/knowledge-chunk-processing.service";

interface CreateKnowledgeChunkJobData {
  content: string;
  departmentId: string;
  userId: string;
}

@Processor("knowledge-chunks")
export class CreateKnowledgeChunksProcessor extends WorkerHost {
  constructor(
    private readonly knowledgeChunkProcessingService: KnowledgeChunkProcessingService
  ) {
    super();
  }

  async process(job: Job<CreateKnowledgeChunkJobData>, token?: string): Promise<any> {
    switch (job.name) {
      case 'create':
        const { content, departmentId, userId } = job.data;
        return await this.knowledgeChunkProcessingService.processKnowledgeChunk({
          content,
          departmentId,
          userId,
        });
    
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}