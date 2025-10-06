import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { uuidv7 as uuid } from 'uuidv7';
export class UUID {
  private _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(value?: string) {
    if (value && !isUUID(value)) {
      throw new BadRequestException({
        details: [{ field: 'id', message: 'ID is invalid' }],
      });
    }
    return new UUID(value ?? uuid());
  }

  public get value(): string {
    return this._value;
  }

  public set value(newValue: string) {
    if (!isUUID(newValue)) {
      throw new BadRequestException({
        details: [{ field: 'id', message: 'ID is invalid' }],
      });
    }
    this._value = newValue;
  }

  public toString(): string {
    return this._value;
  }
}
