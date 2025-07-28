import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Point } from './point.entity';
import { Department } from 'src/department/domain/entities/department.entity';

interface CreateKnowledgeChunkOptions {
  id?: string;
  content: string;
  point?: Point; // Made optional since point will be created after chunk
  department: Department;
}

export class KnowledgeChunk {
  private _id: UUID;
  private _content: string;
  private _point: Point | null;
  private _department: Department;

  private constructor(
    id: UUID,
    content: string,
    point: Point | null,
    department: Department,
  ) {
    this._id = id;
    this._content = content;
    this._point = point;
    this._department = department;
  }

  static create({
    id,
    content,
    point = null,
    department,
  }: CreateKnowledgeChunkOptions): KnowledgeChunk {
    return new KnowledgeChunk(UUID.create(id), content, point, department);
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get content(): string {
    return this._content;
  }

  get point(): Point {
    return this._point;
  }

  get department(): Department {
    return this._department;
  }

  // Setters
  set content(newContent: string) {
    this._content = newContent;
  }

  set point(newPoint: Point) {
    this._point = newPoint;
  }

  // Utility methods
  public updateContent(newContent: string): void {
    this._content = newContent;
  }

  public updatePoint(newPoint: Point): void {
    this._point = newPoint;
  }

  public updateDepartment(newDepartment: Department): void {
    this._department = newDepartment;
  }

  public equals(other: KnowledgeChunk): boolean {
    return this._id.value === other._id.value;
  }

  public clone(): KnowledgeChunk {
    return new KnowledgeChunk(
      this._id,
      this._content,
      this._point,
      this._department,
    );
  }

  public toJSON(): object {
    return {
      id: this._id.toString(),
      content: this._content,
      point: this.point ? this._point.toJSON() : null,
      department: this._department.toJSON(),
    };
  }
}
