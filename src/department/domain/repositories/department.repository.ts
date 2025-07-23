import { Department } from '../entities/department.entity';

export abstract class DepartmentRepository {
  /**
   * Save a department. If the department already exists (by id), it should update it.
   * Returns the saved or updated department.
   */
  abstract save(department: Department): Promise<Department>;

  /**
   * Find a department by its unique identifier.
   * Returns the department if found, otherwise null.
   */
  abstract findById(id: string): Promise<Department | null>;

  /**
   * Find multiple departments by their ids.
   * Returns an array of found departments.
   */
  abstract findByIds(ids: string[]): Promise<Department[]>;

  /**
   * Find all departments.
   */
  abstract findAll(): Promise<Department[]>;

  /**
   * Remove a department by its id.
   * Returns the removed department if it existed, otherwise null.
   */
  abstract removeById(id: string): Promise<Department | null>;

  /**
   * Remove multiple departments by their ids.
   * Returns the list of removed departments.
   */
  abstract removeByIds(ids: string[]): Promise<Department[]>;

  /**
   * Update a department by its id with partial data.
   * Returns the updated department.
   */
  abstract update(id: string, update: Partial<Department>): Promise<Department>;

  /**
   * Check if a department exists by its id.
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Count the total number of departments in the repository.
   */
  abstract count(): Promise<number>;

  /**
   * Find departments by criteria.
   */
  abstract findByCriteria(criteria: Partial<Department>): Promise<Department[]>;
}
