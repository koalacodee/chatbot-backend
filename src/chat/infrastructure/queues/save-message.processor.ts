import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SaveMessagesUseCase } from 'src/chat/application/use-cases/save-messages.use-case';

@Processor('chat')
export class SaveMessageProcessor extends WorkerHost {
  constructor(private readonly saveMessageUseCase: SaveMessagesUseCase) {
    super();
  }

  async process(job: Job) {
    const { question, answer, conversationId, currentChunks } = job.data;

    switch (job.name) {
      case 'save-message':
        await this.saveMessageUseCase.execute(
          question,
          answer,
          conversationId,
          currentChunks,
        );
        break;
      default:
        throw new Error(`Invalid job name: ${job.name}`);
    }
  }
}
