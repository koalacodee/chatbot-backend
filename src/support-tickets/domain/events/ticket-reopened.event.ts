export class TicketReopenedEvent {
  constructor(
    public readonly ticketId: string,
    public readonly subject: string,
    public readonly answeredByUserId: string,
    public readonly departmentId: string,
    public readonly subDepartmentId?: string,
    public readonly reopenedAt: Date = new Date(),
  ) {}
}
