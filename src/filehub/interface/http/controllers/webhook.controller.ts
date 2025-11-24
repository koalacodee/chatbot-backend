import { Body, Controller, Post } from '@nestjs/common';
import { HandleUploadWebhookUseCase } from 'src/filehub/application/use-cases/handle-upload-webhook.use-case';
import { WebhookData } from 'src/filehub/domain/services/filehub.service';

@Controller('filehub/webhook')
export class FilehubWebhookController {
  constructor(
    private readonly handleUploadWebhookUseCase: HandleUploadWebhookUseCase,
  ) {}

  @Post('/uploaded')
  async handleUploadWebhook(@Body() body: WebhookData): Promise<void> {
    console.log(body);

    await this.handleUploadWebhookUseCase.execute(body);
  }
}
