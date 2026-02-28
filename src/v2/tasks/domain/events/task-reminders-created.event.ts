export class TaskRemindersCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly reminders: {
      id: string;
      interval: number;
      dueDate: Date;
    }[],
    public readonly daysBeforeDeadlineReminder: number,
  ) {}
}
