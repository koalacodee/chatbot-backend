export class FaqCreatedEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly createdById: string,
    public readonly createdAt: Date,
  ) {}
}
