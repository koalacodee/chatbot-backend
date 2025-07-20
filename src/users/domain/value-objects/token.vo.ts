import { randomBytes } from 'crypto';

export class Token {
  private _value: string;
  constructor() {
    this._value = randomBytes(32).toString('hex');
  }

  get value() {
    return this._value;
  }

  toString() {
    return this._value;
  }
}
