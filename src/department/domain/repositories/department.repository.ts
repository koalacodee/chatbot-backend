import { Department } from '../entities/department.entity';

export interface DepartmentQueryDto {
  includeQuestions?: boolean;
  includeKnowledgeChunks?: boolean;
  includeSubDepartments?: boolean;
  includeParent?: boolean;
}

export abstract class DepartmentRepository {
  /**
   * Save a department. If the department already exists (by id), it should update it.
   * Returns the saved or updated department.
   */
  abstract save(
    department: Department,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department>;

  /**
   * Find a department by its unique identifier.
   * Returns the department if found, otherwise null.
   */
  abstract findById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null>;

  /**
   * Find multiple departments by their ids.
   * Returns an array of found departments.
   */
  abstract findByIds(
    ids: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]>;

  /**
   * Find all departments.
   */
  abstract findAll(queryDto?: DepartmentQueryDto): Promise<Department[]>;

  abstract findAllDepartments(
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]>;

  /**
   * Find a department by its unique identifier and verify it's a main department (no parent).
   * Returns the department if found and is a main department, otherwise null.
   */
  abstract findMainDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null>;

  /**
   * Find a department by its unique identifier and verify it's a sub-department (has parent).
   * Returns the department if found and is a sub-department, otherwise null.
   */
  abstract findSubDepartmentById(
    id: string,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department | null>;

  /**
   * Remove a department by its id.
   * Returns the removed department if it existed, otherwise null.
   */
  abstract removeById(id: string): Promise<Department | null>;

  /**
   * Remove a main department by its id (ensures it's not a sub-department).
   * Returns the removed department if it existed and was a main department, otherwise null.
   */
  abstract removeMainDepartmentById(id: string): Promise<Department | null>;

  /**
   * Remove a sub-department by its id (ensures it is a sub-department).
   * Returns the removed department if it existed and was a sub-department, otherwise null.
   */
  abstract removeSubDepartmentById(id: string): Promise<Department | null>;

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
   * Update a main department by its id (ensures it's not a sub-department).
   * Returns the updated department if it existed and was a main department.
   */
  abstract updateMainDepartment(
    id: string,
    update: Partial<Department>,
    query?: DepartmentQueryDto,
  ): Promise<Department>;

  /**
   * Update a sub-department by its id (ensures it is a sub-department).
   * Returns the updated department if it existed and was a sub-department.
   */
  abstract updateSubDepartment(
    id: string,
    update: Partial<Department>,
    query?: DepartmentQueryDto,
  ): Promise<Department>;

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
  abstract findByCriteria(
    criteria: Partial<Department>,
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]>;

  abstract findAllSubDepartments(
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
    departmentId?: string,
  ): Promise<Department[]>;

  abstract canDelete(
    departmentId: string,
    isSubDepartment?: boolean,
  ): Promise<boolean>;

  /**
   * Check if a department is a main department (has no parent).
   */
  abstract isMainDepartment(id: string): Promise<boolean>;

  /**
   * Check if a department is a sub-department (has parent).
   */
  abstract isSubDepartment(id: string): Promise<boolean>;

  abstract viewMainDepartments(options?: {
    limit?: number;
    page?: number;
  }): Promise<Department[]>;

  abstract viewSubDepartments(options?: {
    limit?: number;
    page?: number;
    departmentId?: string;
  }): Promise<Department[]>;

  abstract findSubDepartmentByParentId(parentId: string): Promise<Department[]>;

  /**
   * Find all departments filtered by supervisor's assigned department IDs.
   * Returns only departments that the supervisor has access to.
   */
  abstract findAllByDepartmentIds(
    departmentIds: string[],
    queryDto?: DepartmentQueryDto,
  ): Promise<Department[]>;

  /**
   * Find all sub-departments filtered by parent department IDs.
   * Returns only sub-departments whose parent is in the provided department IDs.
   */
  abstract findAllSubDepartmentsByParentIds(
    parentDepartmentIds: string[],
    queryDto?: Omit<DepartmentQueryDto, 'includeSubDepartments'>,
  ): Promise<Department[]>;

  /**
   * Validate if a user has access to a specific department.
   * Returns true if the user has access, false otherwise.
   */
  abstract validateDepartmentAccess(
    departmentId: string,
    userDepartmentIds: string[],
  ): Promise<boolean>;
}
