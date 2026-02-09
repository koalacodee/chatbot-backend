export class TaskPresetCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly assignerId: string,
    public readonly assignerRole: 'ADMIN' | 'SUPERVISOR',
    public readonly presetName: string,
  ) {}
}
