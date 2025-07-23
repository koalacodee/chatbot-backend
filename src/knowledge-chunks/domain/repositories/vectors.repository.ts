import { Vector } from '../value-objects/vector.vo';

export abstract class VectorsRepository {
  /**
   * Save a vector. If the vector already exists (by id), it should update it.
   * Returns the saved or updated vector.
   */
  abstract save(vector: Vector): Promise<Vector>;

  /**
   * Save multiple vectors in a batch operation.
   * Returns the saved vectors.
   */
  abstract saveMany(vectors: Vector[]): Promise<Vector[]>;

  /**
   * Find a vector by its unique identifier.
   * Returns the vector if found, otherwise null.
   */
  abstract findById(id: string): Promise<Vector | null>;

  /**
   * Find multiple vectors by their ids.
   * Returns an array of found vectors.
   */
  abstract findByIds(ids: string[]): Promise<Vector[]>;

  /**
   * Remove a vector by its id.
   * Returns the removed vector if it existed, otherwise null.
   */
  abstract removeById(id: string): Promise<Vector | null>;

  /**
   * Remove multiple vectors by their ids.
   * Returns the list of removed vectors.
   */
  abstract removeByIds(ids: string[]): Promise<Vector[]>;

  /**
   * Search for vectors similar to the given vector.
   * Returns an array of the most similar vectors, up to the specified limit.
   */
  abstract search(
    vector: Vector,
    limit: number,
    minScore?: number,
  ): Promise<Vector[]>;

  /**
   * Count the total number of vectors in the repository.
   */
  abstract count(): Promise<number>;

  /**
   * Check if a vector exists by its id.
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Update a vector by its id with partial data.
   * Returns the updated vector.
   */
  abstract update(id: string, update: Partial<Vector>): Promise<Vector>;

  /**
   * Retrieve all vectors (with optional pagination).
   */
  abstract findAll(offset?: number, limit?: number): Promise<Vector[]>;
}
