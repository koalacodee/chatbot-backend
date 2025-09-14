export class TicketAssignedEvent {
  constructor(
    public readonly ticketId: string,
    public readonly subject: string,
    public readonly assignedEmployeeId: string,
    public readonly assignedAt: Date = new Date(),
  ) {}
}
