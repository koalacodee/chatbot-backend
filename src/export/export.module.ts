import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ExportRepository } from './domain/repositories/export.repository';
import { DrizzleExportRepository } from './infrastructure/repositories/drizzle-export.repository';
import { CsvService } from './domain/services/csv.service';
import { CsvService as CsvServiceImpl } from './infrastructure/services/csv.service';
import { ExportService } from './domain/services/export.service';
import { ExportService as ExportServiceImpl } from './infrastructure/services/export.service';
import { ExportFileService } from './domain/services/export-file.service';
import { ExportFileServiceImpl } from './infrastructure/services/export-file.service';
import { ExportFileController } from './interface/http/export-file.controller';

// FileHubService comes from FilehubModule, which is @Global().
@Module({
  imports: [ConfigModule],
  controllers: [ExportFileController],
  providers: [
    { provide: ExportRepository, useClass: DrizzleExportRepository },
    { provide: CsvService, useClass: CsvServiceImpl },
    { provide: ExportService, useClass: ExportServiceImpl },
    { provide: ExportFileService, useClass: ExportFileServiceImpl },
  ],
  exports: [ExportRepository, CsvService, ExportService, ExportFileService],
})
export class ExportModule { }