import { Export } from "../entities/export.entity";

export type Primitive = string | number | boolean | null | undefined;

export abstract class ExportService {
  abstract export(data: { [key: string]: Primitive }[]): Promise<Export>
  abstract exportFromAsyncGenerator(data: AsyncGenerator<{ [key: string]: Primitive }[]>): Promise<Export>
}