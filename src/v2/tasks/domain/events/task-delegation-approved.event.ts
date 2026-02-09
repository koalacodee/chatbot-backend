export class TaskDelegationApprovedEvent {
  constructor(
    public readonly delegationId: string,
    public readonly submissionId: string,
    public readonly reviewerId: string,
    public readonly feedback?: string,
  ) {}
}
