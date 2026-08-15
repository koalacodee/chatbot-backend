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
          // No `cast`: CSV has no types, and inferring them corrupts data that only looks
          // numeric — a leading-zero employee id, a phone number, a version like "1.10".
          // Callers know what each column means and can coerce; this cannot.
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

