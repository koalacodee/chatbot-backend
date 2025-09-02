export class FaqUpdatedEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly updatedById: string,
    public readonly updatedAt: Date,
  ) {}
}
