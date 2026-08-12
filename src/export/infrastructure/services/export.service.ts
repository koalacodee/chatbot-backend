import { Injectable } from '@nestjs/common';
import {
  ExportService as AbstractExportService,
  Primitive,
} from '../../domain/services/export.service';
import { CsvService } from '../../domain/services/csv.service';
import { ExportRepository } from 'src/export/domain/repositories/export.repository';
import { Export, ExportType } from 'src/export/domain/entities/export.entity';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import ky from 'ky';

@Injectable()
export class ExportService extends AbstractExportService {
  private readonly uploadUrlTtlSeconds = 3600;
  private readonly uploadTimeoutMs = 300000;

  constructor(
    private readonly csvService: CsvService,
    private readonly exportRepository: ExportRepository,
    private readonly fileHubService: FileHubService,
  ) {
    super();
  }

  /**
   * Uploads a CSV payload to FileHub through a signed PUT URL and returns the
   * object key to persist on the export row. That key is the same value
   * FileHubService.getSignedUrl() expects when the file is read back.
   */
  private async uploadCsv(
    csv: string,
  ): Promise<{ objectName: string; bytesUploaded: number }> {
    const { signedUrl, filename } = await this.fileHubService.getSignedPutUrl(
      this.uploadUrlTtlSeconds,
      'csv',
    );

    await ky.put(signedUrl, {
      body: csv,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      timeout: this.uploadTimeoutMs,
    });

    return { objectName: filename, bytesUploaded: Buffer.byteLength(csv) };
  }

  async export(data: { [key: string]: Primitive }[]): Promise<Export> {
    const csvString = await this.csvService.stringify(data);
    const result = await this.uploadCsv(csvString);

    const exportEntity = Export.create({
      type: ExportType.CSV,
      objectPath: result.objectName,
      size: result.bytesUploaded,
      rows: data.length,
    });

    return this.exportRepository.save(exportEntity);
  }

  async exportFromAsyncGenerator(
    data: AsyncGenerator<{ [key: string]: Primitive }[]>,
  ): Promise<Export> {
    const chunks: string[] = [];
    let isFirstChunk = true;
    let rows = 0;

    for await (const chunk of data) {
      const csvString = await this.csvService.stringify(chunk);

      if (isFirstChunk) {
        isFirstChunk = false;
        chunks.push(csvString);
      } else {
        // Subsequent chunks repeat the header row — drop it.
        const lines = csvString.split('\n');
        if (lines.length > 1) {
          chunks.push(lines.slice(1).join('\n'));
        }
      }
      rows += chunk.length;
    }

    const result = await this.uploadCsv(chunks.join(''));

    const exportEntity = Export.create({
      type: ExportType.CSV,
      objectPath: result.objectName,
      size: result.bytesUploaded,
      rows,
    });

    return this.exportRepository.save(exportEntity);
  }
}
