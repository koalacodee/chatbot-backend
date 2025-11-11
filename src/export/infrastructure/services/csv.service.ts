import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { CsvService as AbstractCsvService } from '../../domain/services/csv.service';

@Injectable()
export class CsvService extends AbstractCsvService {
  async parse(csv: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      parse(
        csv,
        {
          columns: true,
          skip_empty_lines: true,
          cast: true,
        },
        (err, records) => {
          if (err) {
            reject(err);
          } else {
            resolve(records);
          }
        },
      );
    });
  }

  async stringify(data: any[]): Promise<string> {
    if (!data || data.length === 0) {
      return '';
    }

    return new Promise((resolve, reject) => {
      stringify(
        data,
        {
          header: true,
        },
        (err, output) => {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        },
      );
    });
  }
}

