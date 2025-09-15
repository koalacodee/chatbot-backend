export class TaskSubmittedEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly submissionType:
      | 'SUPERVISOR_REVIEW'
      | 'ADMIN_REVIEW'
      | 'SUPERVISOR_AND_ADMIN_REVIEW',
    public readonly assignedEmployeeId?: string,
    public readonly supervisorId?: string,
    public readonly submittedAt: Date = new Date(),
  ) {}
}
