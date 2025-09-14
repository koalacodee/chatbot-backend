export class StaffRequestCreatedEvent {
  constructor(
    public readonly requestId: string,
    public readonly newEmployeeUsername: string,
    public readonly requestedBySupervisorId: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
