import { Vector } from 'src/shared/value-objects/vector.vo';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export class Point {
  private constructor(
    private _id: UUID,
    private _vector: Vector,
  ) {}

  public static create({ id, vector }: { id?: string; vector: Vector }): Point {
    return new Point(UUID.create(id), vector);
  }

  // Getters
  public get id(): UUID {
    return this._id;
  }

  public get vector(): Vector {
    return this._vector;
  }

  // Setters
  public updateVector(newVector: Vector): void {
    this._vector = newVector;
  }

  toJSON() {
    return {
      id: this._id.toString(),
      vector: this._vector.value,
    };
  }
}
