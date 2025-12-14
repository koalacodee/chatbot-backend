import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Point } from '../../../shared/entities/point.entity';
import { Department } from 'src/department/domain/entities/department.entity';

interface CreateKnowledgeChunkOptions {
  id?: string;
  content: string;
  point?: Point; // Made optional since point will be created after chunk
  pointId?: string; // Add pointId to track the relation
  department?: Department;
}

export class KnowledgeChunk {
  private _id: UUID;
  private _content: string;
  private _point: Point | null;
  private _pointId: string | null;
  private _department: Department | null;

  private constructor(
    id: UUID,
    content: string,
    point: Point | null,
    pointId: string | null,
    department?: Department,
  ) {
    this._id = id;
    this._content = content;
    this._point = point;
    this._pointId = pointId;
    this._department = department ?? null;
  }

  static create({
    id,
    content,
    point = null,
    pointId = null,
    department = null,
  }: CreateKnowledgeChunkOptions): KnowledgeChunk {
    return new KnowledgeChunk(
      UUID.create(id),
      content,
      point,
      pointId,
      department,
    );
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get content(): string {
    return this._content;
  }

  get point(): Point | null {
    return this._point;
  }

  get pointId(): string | null {
    return this._pointId;
  }

  get department(): Department | null {
    return this._department;
  }

  // Setters
  set content(newContent: string) {
    this._content = newContent;
  }

  set point(newPoint: Point) {
    this._point = newPoint;
    this._pointId = newPoint.id.value;
  }

  // Utility methods
  public updateContent(newContent: string): void {
    this._content = newContent;
  }

  public updatePoint(newPoint: Point): void {
    this._point = newPoint;
    this._pointId = newPoint.id.value;
  }

  public updatePointId(pointId: string): void {
    this._pointId = pointId;
    this._point = null; // Clear the point object since we only have the ID
  }

  public updateDepartment(newDepartment: Department | null): void {
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
      this._pointId,
      this._department,
    );
  }

  public toJSON(): object {
    return {
      id: this._id.toString(),
      content: this._content,
      point: this.point ? this._point.toJSON() : null,
      pointId: this._pointId,
      department: this._department ? this._department.toJSON() : null,
    };
  }
}
