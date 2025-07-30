import { randomInt } from 'crypto';

export class TicketCode {
  private readonly _value: string;

  private constructor(value: string) {
    if (!TicketCode.isValid(value)) {
      throw new Error('Invalid ticket code format. Must be an 8-digit number.');
    }
    this._value = value;
  }

  /**
   * Creates a new TicketCode instance.
   * If no value is provided, generates a random 8-digit code.
   */
  static create(value?: string): TicketCode {
    if (value) {
      return new TicketCode(value);
    }
    // Generate a random 8-digit number as a string
    const code = randomInt(1e7, 1e8).toString().padStart(8, '0');
    return new TicketCode(code);
  }

  /**
   * Validates the ticket code format.
   * Must be an 8-digit string.
   */
  static isValid(value: string): boolean {
    return /^\d{8}$/.test(value);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * Compares this TicketCode with another for equality.
   */
  equals(other: TicketCode): boolean {
    return other instanceof TicketCode && this._value === other._value;
  }
}
