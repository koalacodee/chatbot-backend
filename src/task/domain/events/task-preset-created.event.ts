export class TaskPresetCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly assignerId: string,
    public readonly assignerRole: string,
    public readonly presetName: string,
  ) {}
}
