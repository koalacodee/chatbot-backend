export enum TicketStatusEnum {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  CLOSED = 'CLOSED',
}

export class TicketStatus {
  private _value: TicketStatusEnum;

  private constructor(value: TicketStatusEnum) {
    this._value = value;
  }

  static create(
    value: TicketStatusEnum = TicketStatusEnum.PENDING,
  ): TicketStatus {
    return new TicketStatus(value);
  }

  get value(): TicketStatusEnum {
    return this._value;
  }

  set value(newValue: TicketStatusEnum) {
    this._value = newValue;
  }

  toString(): string {
    return TicketStatusEnum[this._value];
  }
}
