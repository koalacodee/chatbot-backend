# Three-Level Task Approval System

## Overview

The task approval system has been refactored to implement a hierarchical three-level approval structure based on task type and user roles. This system ensures proper access control and maintains department hierarchy integrity.

## Approval Levels

### 1. Department Level Task Approval
- **Available Roles**: Admin only
- **Condition**: Task must have `targetDepartmentId`
- **Rules**: Only Admins can approve department-level tasks
- **Access Control**: Strict admin-only validation

### 2. Sub-Department Level Task Approval
- **Available Roles**: Admins and Supervisors
- **Condition**: Task must have `targetSubDepartmentId`
- **Rules**:
  - **Admins**: Can approve any sub-department task
  - **Supervisors**: Can approve tasks for any sub-department that belongs to a department they supervise
- **Access Control**: Hierarchical validation checking parent department relationships

### 3. Employee Level Task Approval
- **Available Roles**: Admins and Supervisors
- **Condition**: Task must have `assigneeId`
- **Rules**:
  - **Admins**: Can approve any employee-level task
  - **Supervisors**: Can approve tasks where the employee belongs to:
    - A sub-department under a department they supervise, OR
    - They are the direct supervisor of the employee
- **Access Control**: Validates employee department membership against supervisor's managed departments

## Implementation Details

### New Files Created

1. **Task Approval Level Enum** (`src/task/domain/value-objects/task-approval-level.vo.ts`)
   - Defines the three approval levels: `DEPARTMENT_LEVEL`, `SUB_DEPARTMENT_LEVEL`, `EMPLOYEE_LEVEL`
   - Provides validation utilities for determining approval rights

2. **Department Hierarchy Service** (`src/task/application/services/department-hierarchy.service.ts`)
   - Handles hierarchical department access validation
   - Provides methods for checking sub-department relationships
   - Validates supervisor access to departments and sub-departments

### Updated Components

1. **Task Entity** (`src/task/domain/entities/task.entity.ts`)
   - Added `approvalLevel` property that automatically determines the approval level
   - Enhanced JSON serialization to include approval level

2. **ApproveTaskUseCase** (`src/task/application/use-cases/approve-task.use-case.ts`)
   - Completely refactored to implement three-level approval validation
   - Added new validation methods for each approval level
   - Enhanced error handling with specific error messages
   - Added DepartmentRepository and DepartmentHierarchyService dependencies

### Access Control Validation

#### Department Level Validation
```typescript
private async validateDepartmentLevelApproval(
  userId: string,
  task: Task,
  role: Roles,
): Promise<void> {
  if (role !== Roles.ADMIN) {
    throw new ForbiddenException(
      'Department-level tasks can only be approved by administrators',
    );
  }
}
```

#### Sub-Department Level Validation
```typescript
private async validateSubDepartmentLevelApproval(
  userId: string,
  task: Task,
  role: Roles,
): Promise<void> {
  if (role === Roles.ADMIN) return; // Admins can approve any
  
  if (role === Roles.SUPERVISOR) {
    // Check if supervisor has access to the sub-department
    const hasAccess = await this.departmentHierarchyService.hasHierarchicalAccess(
      task.targetSubDepartment.id.toString(),
      supervisorDepartmentIds,
    );
  }
}
```

#### Employee Level Validation
```typescript
private async validateEmployeeLevelApproval(
  userId: string,
  task: Task,
  role: Roles,
): Promise<void> {
  if (role === Roles.ADMIN) return; // Admins can approve any
  
  if (role === Roles.SUPERVISOR) {
    // Check if employee belongs to supervisor's managed departments
    const hasAccess = employeeDepartmentIds.some(deptId =>
      supervisorDepartmentIds.includes(deptId) ||
      this.departmentHierarchyService.hasHierarchicalAccess(deptId, supervisorDepartmentIds)
    );
  }
}
```

## API Endpoints

### Task Approval Endpoints

1. **POST /tasks/:id/approve**
   - **Authentication**: Required (Supervisor or Admin)
   - **Body**: `{ approverId: string }`
   - **Access Control**: Validated based on task level and user role
   - **Response**: Updated task object with approval details

2. **GET /tasks/admin/department-level**
   - **Authentication**: Admin only
   - **Purpose**: Retrieve department-level tasks
   - **Access Control**: Admin-only access

3. **GET /tasks/supervisor/sub-department**
   - **Authentication**: Supervisor only
   - **Purpose**: Retrieve sub-department level tasks
   - **Access Control**: Limited to supervisor's managed departments

4. **GET /tasks/supervisor/employee-level**
   - **Authentication**: Supervisor only
   - **Purpose**: Retrieve employee-level tasks
   - **Access Control**: Limited to supervisor's managed departments

## Error Handling

The system provides comprehensive error handling with specific error messages:

- **ForbiddenException**: When user lacks permission for the approval level
- **BadRequestException**: When task configuration is invalid for its level
- **NotFoundException**: When referenced entities (employee, department) are not found

### Error Examples

```json
{
  "statusCode": 403,
  "message": "Department-level tasks can only be approved by administrators",
  "error": "Forbidden"
}

{
  "statusCode": 403,
  "message": "You do not have permission to approve tasks for this sub-department",
  "error": "Forbidden"
}

{
  "statusCode": 403,
  "message": "You do not have permission to approve tasks for this employee",
  "error": "Forbidden"
}
```

## Extensibility

The system is designed to be extensible for future approval levels or rules:

1. **New Approval Levels**: Add new enum values to `TaskApprovalLevel`
2. **Custom Rules**: Extend validation methods in `ApproveTaskUseCase`
3. **Additional Context**: Add new context fields to validation methods
4. **Enhanced Hierarchy**: Extend `DepartmentHierarchyService` for complex relationships

## Testing Considerations

When testing the approval system:

1. **Test Department Level**: Only admins should succeed
2. **Test Sub-Department Level**: Admins always succeed, supervisors only for their departments
3. **Test Employee Level**: Admins always succeed, supervisors only for their employees
4. **Test Hierarchy**: Ensure sub-department access respects parent department relationships
5. **Test Error Cases**: Verify appropriate error messages for unauthorized access

## Migration Notes

- Existing tasks will automatically determine their approval level based on their current configuration
- No database schema changes required
- Backward compatible with existing task data
- New approval level information is included in task JSON responses
