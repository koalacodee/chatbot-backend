export class TaskApprovedEvent {
  constructor(
    public readonly title: string,
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly performedById?: string,
    public readonly performerId?: string,
    public readonly assigneeId?: string,
  ) {}
}
