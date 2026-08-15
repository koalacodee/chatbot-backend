import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Point } from '../../../shared/entities/point.entity';
import { Department } from 'src/department/domain/entities/department.entity';

interface CreateKnowledgeChunkOptions {
  id?: string;
  content: string;
  point?: Point; // Made optional since point will be created after chunk
  pointId?: string; // Add pointId to track the relation
  department?: Department;
  departmentId: string;
}

export class KnowledgeChunk {
  private _id: UUID;
  private _content: string;
  private _point: Point | null;
  private _pointId: string | null;
  private _department: Department | null;
  private _departmentId: string;

  private constructor(options: CreateKnowledgeChunkOptions) {
    this._id = UUID.create(options.id);
    this._content = options.content;
    this._point = options.point;
    this._pointId = options.pointId;
    this._department = options.department ?? null;
    this._departmentId = options.departmentId;
  }

  static create(options: CreateKnowledgeChunkOptions): KnowledgeChunk {
    return new KnowledgeChunk(options);
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

  get departmentId(): string {
    return this._departmentId;
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

  set departmentId(newDepartmentId: string) {
    this._departmentId = newDepartmentId;
    // Mirrors updatePointId: an id we can no longer vouch for invalidates the object.
    if (this._department && this._department.id.value !== newDepartmentId) {
      this._department = null;
    }
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

    // department_id is NOT NULL, so detaching the object must not orphan the id — only
    // attaching a real department moves it.
    if (newDepartment) this._departmentId = newDepartment.id.value;
  }

  public equals(other: KnowledgeChunk): boolean {
    return this._id.value === other._id.value;
  }

  public toJSON(): object {
    return {
      id: this._id.toString(),
      content: this._content,
      point: this.point ? this._point.toJSON() : null,
      pointId: this._pointId,
      department: this._department ? this._department.toJSON() : null,
      departmentId: this._departmentId,
    };
  }
}
