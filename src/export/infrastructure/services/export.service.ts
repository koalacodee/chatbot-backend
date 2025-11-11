import { Injectable } from '@nestjs/common';
import { ExportService as AbstractExportService, Primitive } from '../../domain/services/export.service';
import { CsvService } from '../../domain/services/csv.service';
import { FileManagementClass } from 'src/files/domain/services/file-mangement.service';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { ExportRepository } from 'src/export/domain/repositories/export.repository';
import { Export, ExportType } from 'src/export/domain/entities/export.entity';

@Injectable()
export class ExportService extends AbstractExportService {
  constructor(
    private readonly csvService: CsvService,
    private readonly fileManagementService: FileManagementClass,
    private readonly exportRepository: ExportRepository,
  ) {
    super();
  }

  async export(data: { [key: string]: Primitive }[]): Promise<Export> {
    // Convert data to CSV string
    const csvString = await this.csvService.stringify(data);

    // Write CSV to temporary file
    const filename = `export-${UUID.create().toString()}.csv`;

    async function* csvBufferGenerator() {
      yield Buffer.from(csvString, 'utf-8');
    }

    const result = await this.fileManagementService.uploadFromAsyncGenerator(
      filename,
      csvBufferGenerator(),
    );

    const exportEntity = Export.create({
      type: ExportType.CSV,
      objectPath: result.objectName,
      size: result.bytesUploaded,
      rows: data.length,
    });

    const savedExportEntity = await this.exportRepository.save(exportEntity);
    return savedExportEntity;
  }

  async exportFromAsyncGenerator(
    data: AsyncGenerator<{ [key: string]: Primitive }[]>,
  ): Promise<Export> {
    // Generate unique filename for the export
    const filename = `export-${UUID.create().toString()}.csv`;

    // Convert data generator to CSV buffer generator
    const csvService = this.csvService;
    let isFirstChunk = true;
    let rows = 0;

    async function* csvBufferGenerator() {
      for await (const chunk of data) {
        // Convert each chunk to CSV
        const csvString = await csvService.stringify(chunk);
        const csvBuffer = Buffer.from(csvString, 'utf-8');

        // For the first chunk, include headers. For subsequent chunks, skip headers
        if (isFirstChunk) {
          isFirstChunk = false;
          yield csvBuffer;
        } else {
          // Remove header line from subsequent chunks
          const lines = csvString.split('\n');
          if (lines.length > 1) {
            const dataLines = lines.slice(1).join('\n');
            yield Buffer.from(dataLines, 'utf-8');
          }
        }
        rows += chunk.length;
      }
    }

    // Upload using uploadFromAsyncGenerator
    const result = await this.fileManagementService.uploadFromAsyncGenerator(
      filename,
      csvBufferGenerator(),
    );

    const exportEntity = Export.create({
      type: ExportType.CSV,
      objectPath: result.objectName,
      size: result.bytesUploaded,
      rows,
    });

    const savedExportEntity = await this.exportRepository.save(exportEntity);

    return savedExportEntity;
  }
}

