export class TaskDelegationRejectedEvent {
  constructor(
    public readonly delegationId: string,
    public readonly submissionId: string,
    public readonly reviewerId: string,
    public readonly reviewerType: 'ADMIN' | 'SUPERVISOR',
    public readonly feedback?: string,
    public readonly rejectedAt: Date = new Date(),
  ) {}
}
