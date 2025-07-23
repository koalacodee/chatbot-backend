import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Vector } from '../value-objects/vector.vo';
import { Department } from 'src/department/domain/entities/department.entity';

interface CreateKnowledgeChunkOptions {
  id?: string;
  content: string;
  vector: Vector;
  department: Department;
}

export class KnowledgeChunk {
  private _id: UUID;
  private _content: string;
  private _vector: Vector;
  private _department: Department;

  private constructor(
    id: UUID,
    content: string,
    vector: Vector,
    department: Department,
  ) {
    this._id = id;
    this._content = content;
    this._vector = vector;
    this._department = department;
  }

  static create({
    id,
    content,
    vector,
    department,
  }: CreateKnowledgeChunkOptions): KnowledgeChunk {
    return new KnowledgeChunk(UUID.create(id), content, vector, department);
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get content(): string {
    return this._content;
  }

  get vector(): Vector {
    return this._vector;
  }

  get department(): Department {
    return this._department;
  }

  // Setters
  set content(newContent: string) {
    this._content = newContent;
  }

  set vector(newVector: Vector) {
    this._vector = newVector;
  }

  // Utility methods
  public updateContent(newContent: string): void {
    this._content = newContent;
  }

  public updateVector(newVector: Vector): void {
    this._vector = newVector;
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
      this._vector,
      this._department,
    );
  }

  public toJSON(): object {
    return {
      id: this._id.toString(),
      content: this._content,
      vector: this._vector.value,
      department: this._department,
    };
  }
}
