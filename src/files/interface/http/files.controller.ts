import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadFileUseCase } from 'src/files/application/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from 'src/files/application/use-cases/delete-file.use-case';
import { GenTokenUseCase } from 'src/files/application/use-cases/gen-token.use-case';
import { FileUploadGuard } from 'src/files/infrastructure/guards/file-upload.guard';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

@Controller('files')
export class FilesController {
  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
    private readonly genTokenUseCase: GenTokenUseCase,
  ) {}

  @Post('single')
  @UseGuards(FileUploadGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.uploadFileUseCase.execute({
      targetId: req.targetId,
      filename: file.filename,
    });
  }

  @Post('multiple')
  @UseGuards(FileUploadGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    await Promise.all(
      files.map((file) =>
        this.uploadFileUseCase.execute({
          targetId: req.targetId,
          filename: file.filename,
        }),
      ),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Delete(':filename')
  async delete(@Param('filename') filename: string): Promise<void> {
    return this.deleteFileUseCase.execute({ filename });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR, Roles.EMPLOYEE)
  @Post('token')
  async generateToken(@Body() dto: { targetId: string }): Promise<any> {
    return this.genTokenUseCase.execute({ targetId: dto.targetId });
  }
}
