import { Employee } from 'src/employee/domain/entities/employee.entity';
import { User } from 'src/shared/entities/user.entity';
import {
  EmployeeRequest,
  RequestStatus,
} from '../entities/employee-request.entity';

/**
 * Approving a request writes three tables at once: the new user, the employee row that
 * points at it, and the request itself moving to APPROVED.
 *
 * They were three independent saves, so a failure partway left the earlier writes
 * committed — most visibly an orphan user with the EMPLOYEE role and no employee row, and
 * a request still sitting at PENDING that could never be approved again because the email
 * and username were now taken.
 */
export interface ApproveEmployeeRequestInput {
  request: EmployeeRequest;
  user: User;
  employee: Employee;
}

export interface ApproveEmployeeRequestResult {
  request: EmployeeRequest;
  user: User;
  employee: Employee;
}

export abstract class EmployeeRequestRepository {
  abstract save(request: EmployeeRequest): Promise<EmployeeRequest>;

  /** Persists the user, the employee and the resolved request in one transaction. */
  abstract approveTransactionally(
    input: ApproveEmployeeRequestInput,
  ): Promise<ApproveEmployeeRequestResult>;
  abstract findById(id: string): Promise<EmployeeRequest | null>;
  abstract findAll(offset?: number, limit?: number): Promise<EmployeeRequest[]>;
  abstract removeById(id: string): Promise<EmployeeRequest | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findBySupervisorId(
    supervisorId: string,
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]>;
  abstract findByStatuses(
    status: RequestStatus[],
    offset?: number,
    limit?: number,
    supervisorId?: string,
  ): Promise<EmployeeRequest[]>;
  abstract findPending(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]>;
  abstract countPending(): Promise<number>;
  abstract findResolved(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]>;
}
