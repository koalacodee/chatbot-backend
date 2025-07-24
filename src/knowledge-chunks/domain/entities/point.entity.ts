import { Vector } from '../value-objects/vector.vo';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export class Point {
  private constructor(
    private _id: UUID,
    private _vector: Vector,
    private _knowledgeChunkId: UUID,
  ) {}

  public static create({
    id,
    vector,
    knowledgeChunkId,
  }: {
    id?: string;
    vector: Vector;
    knowledgeChunkId: string;
  }): Point {
    return new Point(UUID.create(id), vector, UUID.create(knowledgeChunkId));
  }

  // Getters
  public get id(): UUID {
    return this._id;
  }

  public get vector(): Vector {
    return this._vector;
  }

  public get knowledgeChunkId(): UUID {
    return this._knowledgeChunkId;
  }

  // Setters
  public updateVector(newVector: Vector): void {
    this._vector = newVector;
  }

  toJSON() {
    return {
      id: this._id.toString(),
      vector: this._vector.value,
      knowledgeChunkId: this._knowledgeChunkId.toString(),
    };
  }
}
