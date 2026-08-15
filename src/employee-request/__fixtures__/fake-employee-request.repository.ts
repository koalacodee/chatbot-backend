import {
  EmployeeRequest,
  RequestStatus,
} from '../domain/entities/employee-request.entity';
import {
  ApproveEmployeeRequestInput,
  ApproveEmployeeRequestResult,
  EmployeeRequestRepository,
} from '../domain/repositories/employee-request.repository';

const RESOLVED = [RequestStatus.APPROVED, RequestStatus.REJECTED];

export class FakeEmployeeRequestRepository extends EmployeeRequestRepository {
  readonly requests = new Map<string, EmployeeRequest>();

  /** Requests handed to `save`, in call order. */
  readonly saved: EmployeeRequest[] = [];

  /** Approvals committed through the transactional path, in call order. */
  readonly approvals: ApproveEmployeeRequestInput[] = [];

  private approvalFailure: Error | null = null;

  seed(...requests: EmployeeRequest[]): this {
    for (const request of requests) this.requests.set(request.id, request);
    return this;
  }

  /** Makes the next approval fail, standing in for a constraint violation. */
  failApprovalWith(error: Error): this {
    this.approvalFailure = error;
    return this;
  }

  /**
   * All three writes land together or none do — the point of the real implementation, so
   * the fake models the same guarantee rather than just recording the call.
   */
  async approveTransactionally(
    input: ApproveEmployeeRequestInput,
  ): Promise<ApproveEmployeeRequestResult> {
    if (this.approvalFailure) {
      const failure = this.approvalFailure;
      this.approvalFailure = null;
      throw failure;
    }

    this.approvals.push(input);
    this.requests.set(input.request.id, input.request);

    return {
      request: input.request,
      user: input.user,
      employee: input.employee,
    };
  }

  private page<T>(items: T[], offset = 0, limit?: number): T[] {
    return limit === undefined
      ? items.slice(offset)
      : items.slice(offset, offset + limit);
  }

  /** Newest first, matching the repository's `order by created_at desc`. */
  private all(): EmployeeRequest[] {
    return [...this.requests.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async save(request: EmployeeRequest): Promise<EmployeeRequest> {
    this.saved.push(request);
    this.requests.set(request.id, request);
    return request;
  }

  async findById(id: string): Promise<EmployeeRequest | null> {
    return this.requests.get(id) ?? null;
  }

  async findAll(offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    return this.page(this.all(), offset, limit);
  }

  async removeById(id: string): Promise<EmployeeRequest | null> {
    const existing = this.requests.get(id) ?? null;
    this.requests.delete(id);
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    return this.requests.has(id);
  }

  async count(): Promise<number> {
    return this.requests.size;
  }

  async findBySupervisorId(
    supervisorId: string,
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    return this.page(
      this.all().filter(
        (request) => request.requestedBySupervisorId === supervisorId,
      ),
      offset,
      limit,
    );
  }

  async findByStatuses(
    statuses: RequestStatus[],
    offset?: number,
    limit?: number,
    supervisorId?: string,
  ): Promise<EmployeeRequest[]> {
    return this.page(
      this.all().filter(
        (request) =>
          statuses.includes(request.status) &&
          (!supervisorId ||
            request.requestedBySupervisorId === supervisorId),
      ),
      offset,
      limit,
    );
  }

  async findPending(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    return this.findByStatuses([RequestStatus.PENDING], offset, limit);
  }

  async countPending(): Promise<number> {
    return this.all().filter(
      (request) => request.status === RequestStatus.PENDING,
    ).length;
  }

  async findResolved(
    offset?: number,
    limit?: number,
  ): Promise<EmployeeRequest[]> {
    return this.findByStatuses(RESOLVED, offset, limit);
  }
}
