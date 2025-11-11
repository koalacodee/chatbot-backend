export abstract class CsvService {
  abstract parse(csv: string): Promise<any[]>
  abstract stringify(data: any[]): Promise<string>
}