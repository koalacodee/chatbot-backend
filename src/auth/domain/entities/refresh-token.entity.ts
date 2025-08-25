import { randomUUID } from 'crypto';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export interface CreateRefreshTokenOptions {
  id?: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  revokedAt?: Date;
  targetId: string;
}

export class RefreshToken {
  private readonly _id: string;
  private _token: string;
  private _expiresAt: Date;
  private _revokedAt: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _targetId: UUID;

  constructor({
    token,
    createdAt,
    updatedAt,
    targetId,
    expiresAt,
    id,
    revokedAt,
  }: CreateRefreshTokenOptions) {
    this._token = token;
    this._expiresAt = expiresAt;
    this._id = id || randomUUID();
    this._revokedAt = this._revokedAt || null;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
    this._targetId = UUID.create(targetId);
  }

  get isRevoked() {
    return !!this._revokedAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  set revokedAt(val: Date | null) {
    this._revokedAt = val;
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

  get targetId(): UUID {
    return this._targetId;
  }

  set targetId(value: UUID) {
    this._targetId = value;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  set expiresAt(value: Date) {
    this._expiresAt = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  set createdAt(value: Date) {
    this._createdAt = value;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  get isExpired(): boolean {
    return this._expiresAt.getTime() < Date.now();
  }

  public toJSON() {
    return {
      id: this.id,
      token: this.token,
      expiresAt: this.expiresAt,
      revokedAt: this.revokedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      targetId: this.targetId.value,
    };
  }
}
