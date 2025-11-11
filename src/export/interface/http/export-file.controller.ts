import {
  Body,
  Controller,
  Get,
  MethodNotAllowedException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ExportFileService } from '../../domain/services/export-file.service';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';

interface ShareExportPayload {
  expiresIn?: number;
}

@Controller('exports/files')
export class ExportFileController {
  constructor(
    private readonly exportFileService: ExportFileService,
  ) { }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      json: 'application/json',
      txt: 'text/plain',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  @AdminAuth()
  @Post(':exportId/share')
  async shareExport(
    @Param('exportId') exportId: string,
    @Body() body: ShareExportPayload,
  ) {
    const result = await this.exportFileService.genShareKey(
      exportId,
      body?.expiresIn,
    );

    return result;
  }

  @Get(':identifier/stream')
  async streamExport(
    @Param('identifier') identifier: string,
    @Res() res: FastifyReply,
  ) {
    const { stream, objectName } =
      await this.exportFileService.getFileStream(identifier);

    if (!stream) {
      throw new MethodNotAllowedException(
        'File streaming is not supported for the current storage driver',
      );
    }

    res.header('Content-Type', this.getContentType(objectName));
    res.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(objectName)}"`,
    );
    res.header('Cache-Control', 'private, max-age=3600');
    res.header('Accept-Ranges', 'bytes');
    return res.send(stream);
  }

  @Get('signed/:identifier')
  async getSignedUrl(@Param('identifier') identifier: string) {
    const signedUrl = await this.exportFileService.getSignedUrl(identifier);

    if (!signedUrl) {
      throw new MethodNotAllowedException(
        'Signed URLs are not supported for the current storage driver',
      );
    }

    return { signedUrl };
  }
}


