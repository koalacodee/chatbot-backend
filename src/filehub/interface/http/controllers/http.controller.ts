import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { GetMyAttachmentsUseCase } from 'src/filehub/application/use-cases/get-my-attachments.use-case';
import { GenerateUserUploadTokenUseCase } from 'src/filehub/application/use-cases/generate-user-upload-token.use-case';
import { DeleteMyAttachmentsUseCase } from 'src/filehub/application/use-cases/delete-my-attachments.use-case';
import { DeleteMyAttachmentsDto } from 'src/filehub/interface/http/dtos/delete-my-attachments.dto';

@Controller('filehub')
export class FilehubHttpController {
  private readonly logger = new Logger(FilehubHttpController.name);

  constructor(
    private readonly getMyAttachmentsUseCase: GetMyAttachmentsUseCase,
    private readonly generateUserUploadTokenUseCase: GenerateUserUploadTokenUseCase,
    private readonly deleteMyAttachmentsUseCase: DeleteMyAttachmentsUseCase,
  ) {}

  @UseGuards(UserJwtAuthGuard)
  @Get('/my-attachments')
  async getMyAttachments(@Req() req: any) {
    const userId = req.user.id;
    this.logger.log(`[HTTP] GET /my-attachments for userId: ${userId}`);

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const result = await this.getMyAttachmentsUseCase.execute({ userId });
    this.logger.log(
      `[HTTP] GET /my-attachments returning ${result.length} attachments`,
    );
    return result;
  }

  @UseGuards(UserJwtAuthGuard)
  @Post('/upload-token')
  async generateUploadToken(@Req() req: any) {
    const userId = req.user.id;
    this.logger.log(`[HTTP] POST /upload-token for userId: ${userId}`);

    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const result =
      await this.generateUserUploadTokenUseCase.execute({ userId });
    this.logger.log(
      `[HTTP] POST /upload-token returning uploadKey for userId: ${userId}`,
    );
    return result;
  }

  @UseGuards(UserJwtAuthGuard)
  @Delete('/my-attachments')
  async deleteMyAttachments(
    @Req() req: any,
    @Query() dto: DeleteMyAttachmentsDto,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    if (dto.attachmentIds && dto.singleAttachmentId) {
      throw new BadRequestException({
        details: [
          {
            field: 'attachmentIds',
            message:
              'Exactly one of attachmentIds or singleAttachmentId must be provided, but not both.',
          },
        ],
      });
    }

    return this.deleteMyAttachmentsUseCase.execute({
      userId,
      attachmentIds: dto.attachmentIds ?? [dto.singleAttachmentId],
    });
  }
}
