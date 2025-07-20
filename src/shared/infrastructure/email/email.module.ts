import { Global, Module } from '@nestjs/common';
import { ResendEmailService } from './resend-email.service';
import { EmailProcessor } from './email.processor';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  providers: [ResendEmailService, EmailProcessor],
  exports: [ResendEmailService],
  imports: [BullModule.registerQueue({ name: 'mails' })],
})
export class EmailModule {}
