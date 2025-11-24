import { BadRequestException } from '@nestjs/common';
import { isEmail } from 'class-validator';

export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    return new Email(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Email): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
