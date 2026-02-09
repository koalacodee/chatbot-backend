export class TaskDelegationSubmissionForwardedEvent {
  constructor(
    public readonly submissionId: string,
    public readonly delegatorId: string,
  ) {}
}
