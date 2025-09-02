import {
  EmployeeRequest,
  RequestStatus,
} from '../entities/employee-request.entity';

export abstract class EmployeeRequestRepository {
  abstract save(request: EmployeeRequest): Promise<EmployeeRequest>;
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
  abstract findResolved(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]>;
}
