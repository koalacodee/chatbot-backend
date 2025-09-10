export enum TaskApprovalLevel {
  DEPARTMENT_LEVEL = 'DEPARTMENT_LEVEL',
  SUB_DEPARTMENT_LEVEL = 'SUB_DEPARTMENT_LEVEL',
  EMPLOYEE_LEVEL = 'EMPLOYEE_LEVEL',
}

export interface ApprovalValidationResult {
  canApprove: boolean;
  reason?: string;
  level: TaskApprovalLevel;
}

export class TaskApprovalValidator {
  static determineApprovalLevel(task: {
    targetDepartmentId?: string;
    targetSubDepartmentId?: string;
    assigneeId?: string;
  }): TaskApprovalLevel {
    if (task.targetDepartmentId) {
      return TaskApprovalLevel.DEPARTMENT_LEVEL;
    }
    
    if (task.targetSubDepartmentId) {
      return TaskApprovalLevel.SUB_DEPARTMENT_LEVEL;
    }
    
    if (task.assigneeId) {
      return TaskApprovalLevel.EMPLOYEE_LEVEL;
    }
    
    throw new Error('Task must have either targetDepartmentId, targetSubDepartmentId, or assigneeId');
  }

  static validateApprovalRequirements(
    level: TaskApprovalLevel,
    userRole: string,
    taskContext: {
      targetDepartmentId?: string;
      targetSubDepartmentId?: string;
      assigneeId?: string;
      assigneeDepartmentId?: string;
    },
    userDepartmentIds: string[] = []
  ): ApprovalValidationResult {
    switch (level) {
      case TaskApprovalLevel.DEPARTMENT_LEVEL:
        return {
          canApprove: userRole === 'ADMIN',
          reason: userRole === 'ADMIN' ? undefined : 'Department-level tasks can only be approved by admins',
          level,
        };

      case TaskApprovalLevel.SUB_DEPARTMENT_LEVEL:
        if (userRole === 'ADMIN') {
          return { canApprove: true, level };
        }
        
        if (userRole === 'SUPERVISOR') {
          const hasAccess = userDepartmentIds.some(deptId => 
            deptId === taskContext.targetSubDepartmentId ||
            this.isSubDepartmentOf(taskContext.targetSubDepartmentId, deptId)
          );
          
          return {
            canApprove: hasAccess,
            reason: hasAccess ? undefined : 'Supervisor does not have access to this sub-department',
            level,
          };
        }
        
        return {
          canApprove: false,
          reason: 'Only admins and supervisors can approve sub-department level tasks',
          level,
        };

      case TaskApprovalLevel.EMPLOYEE_LEVEL:
        if (userRole === 'ADMIN') {
          return { canApprove: true, level };
        }
        
        if (userRole === 'SUPERVISOR') {
          const hasAccess = userDepartmentIds.some(deptId => 
            deptId === taskContext.assigneeDepartmentId ||
            this.isSubDepartmentOf(taskContext.assigneeDepartmentId, deptId)
          );
          
          return {
            canApprove: hasAccess,
            reason: hasAccess ? undefined : 'Supervisor does not have access to approve tasks for this employee',
            level,
          };
        }
        
        return {
          canApprove: false,
          reason: 'Only admins and supervisors can approve employee-level tasks',
          level,
        };

      default:
        return {
          canApprove: false,
          reason: 'Invalid approval level',
          level,
        };
    }
  }

  private static isSubDepartmentOf(subDepartmentId: string, parentDepartmentId: string): boolean {
    // This will be implemented by the department hierarchy validation utilities
    return false;
  }
}
