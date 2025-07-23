import { UUID } from 'src/shared/value-objects/uuid.vo';

type VectorDim = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192;

interface CreateVectorOptions {
  id?: string;
  vector?: Array<number>;
  dim: VectorDim;
}

export class Vector {
  private constructor(
    private _id: UUID,
    private _value: Array<number>,
    private _dim: VectorDim,
  ) {}

  public static create({ id, vector, dim }: CreateVectorOptions): Vector {
    if (vector && vector.length && vector.length !== dim) {
      throw new Error('Vector Dimension is Conflicted with its value');
    }

    return new Vector(UUID.create(id), vector || new Array(dim).fill(0), dim);
  }

  // Getters
  public get id(): UUID {
    return this._id;
  }

  public get value(): Array<number> {
    return [...this._value]; // Return a copy to prevent external modification
  }

  public get dim(): VectorDim {
    return this._dim;
  }

  // Setters
  public setValue(newValue: Array<number>): void {
    if (newValue.length !== this._dim) {
      throw new Error('Vector Dimension is Conflicted with its value');
    }
    this._value = [...newValue];
  }

  public setValueAtIndex(index: number, value: number): void {
    if (index < 0 || index >= this._dim) {
      throw new Error('Index out of bounds');
    }
    this._value[index] = value;
  }

  // Scalar multiplication
  public scalarMultiply(scalar: number): Vector {
    const multipliedValue = this._value.map((element) => element * scalar);
    return Vector.create({
      vector: multipliedValue,
      dim: this._dim,
    });
  }

  // Weighting (alias for scalar multiplication)
  public weight(weight: number): Vector {
    return this.scalarMultiply(weight);
  }

  // Static method for weighted sum of vectors
  public static weightedSum(
    vectors: Array<{ vector: Vector; weight: number }>,
  ): Vector {
    if (vectors.length === 0) {
      throw new Error('Cannot compute weighted sum of empty vector array');
    }

    const firstVector = vectors[0].vector;
    const dim = firstVector.dim;

    // Check if all vectors have the same dimension
    for (const { vector } of vectors) {
      if (vector.dim !== dim) {
        throw new Error(
          'All vectors must have the same dimension for weighted sum',
        );
      }
    }

    const result = new Array(dim).fill(0);

    for (const { vector, weight } of vectors) {
      const weightedVector = vector.scalarMultiply(weight);
      for (let i = 0; i < dim; i++) {
        result[i] += weightedVector.value[i];
      }
    }

    return Vector.create({
      vector: result,
      dim: dim,
    });
  }

  // Method to sum a vector on the existing value with some weight
  public addWeightedVector(vector: Vector, weight: number): Vector {
    if (vector.dim !== this._dim) {
      throw new Error('Vectors must have the same dimension for addition');
    }

    const weightedVector = vector.scalarMultiply(weight);
    const result = new Array(this._dim);

    for (let i = 0; i < this._dim; i++) {
      result[i] = this._value[i] + weightedVector.value[i];
    }

    return Vector.create({
      vector: result,
      dim: this._dim,
    });
  }

  // Additional utility methods
  public add(vector: Vector): Vector {
    return this.addWeightedVector(vector, 1);
  }

  public subtract(vector: Vector): Vector {
    return this.addWeightedVector(vector, -1);
  }

  public magnitude(): number {
    return Math.sqrt(
      this._value.reduce((sum, element) => sum + element * element, 0),
    );
  }

  public normalize(): Vector {
    const mag = this.magnitude();
    if (mag === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    return this.scalarMultiply(1 / mag);
  }

  public dotProduct(vector: Vector): number {
    if (vector.dim !== this._dim) {
      throw new Error('Vectors must have the same dimension for dot product');
    }

    return this._value.reduce(
      (sum, element, index) => sum + element * vector.value[index],
      0,
    );
  }
}
