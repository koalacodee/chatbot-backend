import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ResendEmailService } from './resend-email.service';

@Processor('mails')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly email: ResendEmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send':
        await this.email.sendEmail(job.data);
        break;

      default:
        break;
    }
  }
}
