import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { randomUUID } from 'crypto';

export class UUID {
  private _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public static create(value?: string) {
    if (value && !isUUID(value, '4')) {
      throw new BadRequestException({ id: 'id_invalid' });
    }
    return new UUID(value ?? randomUUID());
  }

  public get value(): string {
    return this._value;
  }

  public set value(newValue: string) {
    if (!isUUID(newValue, '4')) {
      throw new BadRequestException({ id: 'id_invalid' });
    }
    this._value = newValue;
  }

  public toString(): string {
    return this._value;
  }
}
