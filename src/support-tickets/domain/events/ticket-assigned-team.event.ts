export class TicketAssignedTeamEvent {
  constructor(
    public readonly ticketId: string,
    public readonly subject: string,
    public readonly assignedEmployeeId: string,
    public readonly supervisorId: string,
    public readonly assignedAt: Date = new Date(),
  ) {}
}
