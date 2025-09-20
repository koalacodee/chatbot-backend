import { Controller, Get, Param, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { GetAttachmentByTokenUseCase } from '../../application/use-cases/get-attachment-by-token.use-case';
import { GetAttachmentMetadataByTokenUseCase } from '../../application/use-cases/get-attachment-metadata-by-token.use-case';
import { createReadStream } from 'fs';

@Controller('attachment')
export class AttachmentController {
  constructor(
    private readonly getAttachmentByTokenUseCase: GetAttachmentByTokenUseCase,
    private readonly getAttachmentMetadataByTokenUseCase: GetAttachmentMetadataByTokenUseCase,
  ) {}

  @Get(':tokenOrId')
  async getAttachmentByToken(
    @Param('tokenOrId') tokenOrId: string,
    @Res() res: FastifyReply,
  ) {
    const result = await this.getAttachmentByTokenUseCase.execute({
      tokenOrId,
    });
    res.header('Content-Type', result.contentType);
    const encodedFilename = encodeURIComponent(result.originalName);
    res.header(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFilename}`,
    );
    res.header('Cache-Control', 'private, max-age=3600');
    res.header('Accept-Ranges', 'bytes');
    const stream = createReadStream(result.filePath);
    return res.send(stream);
  }

  @Get(':tokenOrId/metadata')
  async getAttachmentMetadataByToken(@Param('tokenOrId') tokenOrId: string) {
    return this.getAttachmentMetadataByTokenUseCase.execute({
      token: tokenOrId,
    });
  }
}
