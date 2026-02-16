import { Body, Controller, Logger, Post } from '@nestjs/common';
import { HandleUploadWebhookUseCase } from 'src/filehub/application/use-cases/handle-upload-webhook.use-case';
import { WebhookData } from 'src/filehub/domain/services/filehub.service';

@Controller('filehub/webhook')
export class FilehubWebhookController {
  private readonly logger = new Logger(FilehubWebhookController.name);

  constructor(
    private readonly handleUploadWebhookUseCase: HandleUploadWebhookUseCase,
  ) {}

  @Post('/uploaded')
  async handleUploadWebhook(@Body() body: WebhookData): Promise<void> {
    this.logger.log(
      `[Webhook] Received upload event: ${body.event}, uploadKey: ${(body as any).upload?.uploadKey ?? 'n/a'}`,
    );
    this.logger.debug(`[Webhook] Full body: ${JSON.stringify(body)}`);

    await this.handleUploadWebhookUseCase.execute(body);
  }
}
