import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UploadFileUseCase } from 'src/files/application/use-cases/upload-file.use-case';
import { FileUploadGuard } from 'src/files/infrastructure/guards/file-upload.guard';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Controller('files')
export class FilesController {
  constructor(private readonly uploadFileUseCase: UploadFileUseCase) {}

  @Post('single')
  @UseGuards(FileUploadGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${UUID.create().toString()}${ext}`);
        },
      }),
    }),
  )
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.uploadFileUseCase.execute({
      targetId: req.targetId,
      filename: file.filename,
    });
  }

  // @Post('multiple')
  // @UseGuards(FileUploadGuard)
  // @UseInterceptors(
  //   FilesInterceptor('files', {
  //     storage: diskStorage({
  //       destination: join(process.cwd(), 'uploads'),
  //       filename: (_, __, cb) => {
  //         cb(null, UUID.create().toString());
  //       },
  //     }),
  //   }),
  // )
  // async uploadMultiple(
  //   @UploadedFiles() files: Express.Multer.File[],
  //   @Req() req: any,
  // ) {
  //   await Promise.all(
  //     files.map((file) =>
  //       this.uploadFileUseCase.execute({
  //         targetId: req.targetId,
  //         filename: file.filename,
  //       }),
  //     ),
  //   );
  // }
}
