import { UUID } from "src/shared/value-objects/uuid.vo";

export enum ExportType {
  CSV = 'CSV',
  JSON = "JSON",
}

export interface ExportOptions {
  id?: string;
  type: ExportType;
  objectPath: string;
  size: number;
  createdAt?: Date;
  updatedAt?: Date;
  rows: number;
}

export class Export {
  private readonly _id: UUID;
  private _type: ExportType;
  private _objectPath: string;
  private _size: number;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _rows: number;

  private constructor(options: ExportOptions) {
    this._id = UUID.create(options.id);
    this._type = options.type;
    this._objectPath = options.objectPath;
    this._size = options.size;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._rows = options.rows;
  }

  static create(options: ExportOptions): Export {
    return new Export(options);
  }

  get id(): string {
    return this._id.toString();
  }

  get type(): ExportType {
    return this._type;
  }

  set type(value: ExportType) {
    this._type = value;
  }

  get objectPath(): string {
    return this._objectPath;
  }

  set objectPath(value: string) {
    this._objectPath = value;
  }

  get size(): number {
    return this._size;
  }

  set size(value: number) {
    this._size = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  set createdAt(value: Date) {
    this._createdAt = value;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  get rows(): number {
    return this._rows;
  }

  set rows(value: number) {
    this._rows = value;
  }

  toJSON() {
    return {
      id: this._id.toString(),
      type: this._type,
      objectPath: this._objectPath,
      size: this._size,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      rows: this._rows,
    };
  }
}