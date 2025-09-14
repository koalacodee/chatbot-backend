export class TicketCreatedEvent {
  constructor(
    public readonly ticketId: string,
    public readonly subject: string,
    public readonly departmentId: string,
    public readonly categoryId: string,
    public readonly subDepartmentId?: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
