export class StaffRequestResolvedEvent {
  constructor(
    public readonly requestId: string,
    public readonly newEmployeeUsername: string,
    public readonly requestedBySupervisorId: string,
    public readonly status: 'approved' | 'rejected',
    public readonly resolvedAt: Date = new Date(),
  ) {}
}
