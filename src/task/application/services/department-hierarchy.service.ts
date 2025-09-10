import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Department } from 'src/department/domain/entities/department.entity';

@Injectable()
export class DepartmentHierarchyService {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  /**
   * Checks if a sub-department belongs to a parent department
   */
  async isSubDepartmentOf(
    subDepartmentId: string,
    parentDepartmentId: string,
  ): Promise<boolean> {
    if (!subDepartmentId || !parentDepartmentId) {
      return false;
    }

    const subDepartment = await this.departmentRepository.findById(
      subDepartmentId,
      { includeParent: true }
    );

    if (!subDepartment || !subDepartment.parent) {
      return false;
    }

    return subDepartment.parent.id.toString() === parentDepartmentId;
  }

  /**
   * Gets all parent department IDs for a sub-department
   */
  async getParentDepartmentIds(subDepartmentId: string): Promise<string[]> {
    const subDepartment = await this.departmentRepository.findById(
      subDepartmentId,
      { includeParent: true }
    );

    if (!subDepartment || !subDepartment.parent) {
      return [];
    }

    return [subDepartment.parent.id.toString()];
  }

  /**
   * Checks if a user has hierarchical access to a department
   * For supervisors: checks if the department is under their supervised departments
   */
  async hasHierarchicalAccess(
    departmentId: string,
    userDepartmentIds: string[],
  ): Promise<boolean> {
    if (!departmentId || !userDepartmentIds || userDepartmentIds.length === 0) {
      return false;
    }

    // Check direct access
    if (userDepartmentIds.includes(departmentId)) {
      return true;
    }

    // Check hierarchical access for sub-departments
    const department = await this.departmentRepository.findById(departmentId, {
      includeParent: true,
    });

    if (!department) {
      return false;
    }

    // If it's a sub-department, check if its parent is in user's departments
    if (department.parent) {
      return userDepartmentIds.includes(department.parent.id.toString());
    }

    return false;
  }

  /**
   * Gets the department ID that an employee belongs to
   * Returns the sub-department ID or supervisor's department ID
   */
  async getEmployeeDepartmentId(employeeId: string): Promise<string | null> {
    // This would need to be implemented based on your employee structure
    // For now, returning null - will need employee repository integration
    return null;
  }

  /**
   * Validates supervisor access for a specific task approval level
   */
  async validateSupervisorAccess(
    supervisorDepartmentIds: string[],
    taskLevel: 'DEPARTMENT' | 'SUB_DEPARTMENT' | 'EMPLOYEE',
    targetContext: {
      targetDepartmentId?: string;
      targetSubDepartmentId?: string;
      assigneeDepartmentId?: string;
    },
  ): Promise<boolean> {
    switch (taskLevel) {
      case 'DEPARTMENT':
        // Department level tasks can only be approved by admins
        return false;

      case 'SUB_DEPARTMENT':
        if (!targetContext.targetSubDepartmentId) {
          return false;
        }
        return this.hasHierarchicalAccess(
          targetContext.targetSubDepartmentId,
          supervisorDepartmentIds,
        );

      case 'EMPLOYEE':
        if (!targetContext.assigneeDepartmentId) {
          return false;
        }
        return this.hasHierarchicalAccess(
          targetContext.assigneeDepartmentId,
          supervisorDepartmentIds,
        );

      default:
        return false;
    }
  }

  /**
   * Gets all sub-department IDs for given parent department IDs
   */
  async getSubDepartmentIdsForParents(
    parentDepartmentIds: string[],
  ): Promise<string[]> {
    if (!parentDepartmentIds || parentDepartmentIds.length === 0) {
      return [];
    }

    const subDepartments = await this.departmentRepository.findAllSubDepartmentsByParentIds(
      parentDepartmentIds,
      { includeParent: true }
    );

    return subDepartments.map(dept => dept.id.toString());
  }
}
