export class CloneTaskAttachmentsEvent {
  constructor(
    public readonly targetTaskId: string,
    public readonly attachmentIds: string[],
  ) {}
}
