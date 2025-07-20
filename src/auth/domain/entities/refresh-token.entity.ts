import { randomUUID } from 'crypto';

export interface CreateRefreshTokenOptions {
  id?: string;
  token: string;
  userId: string;
  expiresAt: Date;
  isRevoked?: boolean;
}

export class RefreshToken {
  private readonly _id: string;
  private _token: string;
  private _userId: string;
  private _expiresAt: Date;
  private _isRevoked: boolean;

  constructor({
    token,
    userId,
    expiresAt,
    id,
    isRevoked,
  }: CreateRefreshTokenOptions) {
    this._token = token;
    this._userId = userId;
    this._expiresAt = expiresAt;
    this._id = id || randomUUID();
    this._isRevoked = isRevoked || false;
  }

  get isRevoked() {
    return this._isRevoked;
  }

  set isRevoked(value: boolean) {
    this._isRevoked = value;
  }

  get id(): string {
    return this._id;
  }

  get token(): string {
    return this._token;
  }

  set token(value: string) {
    this._token = value;
  }

  get userId(): string {
    return this._userId;
  }

  set userId(value: string) {
    this._userId = value;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  set expiresAt(value: Date) {
    this._expiresAt = value;
  }

  get isExpired(): boolean {
    return this._expiresAt.getTime() < Date.now();
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt,
    };
  }
}
