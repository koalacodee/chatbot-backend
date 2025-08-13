import { Question } from 'src/questions/domain/entities/question.entity';
import { UUID } from '../value-objects/uuid.vo';
import { Guest } from 'src/guest/domain/entities/guest.entity';

enum InteractionType {}

interface InteractionOptions {
  id?: string;
  type: InteractionType;
  createdAt?: Date;
  updatedAt?: Date;
  question: Question;
  guest: Guest;
}

export class Interaction {
  private _id: UUID;
  private _type: InteractionType;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _question: Question;
  private _guest: Guest;

  constructor(options: InteractionOptions) {
    this._id = options.id ? UUID.create(options.id) : UUID.create();
    this._type = options.type;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._question = options.question;
    this._guest = options.guest;
  }

  public get id(): string {
    return this._id.value;
  }

  public set id(value: string) {
    this._id = UUID.create(value);
  }

  public get type(): InteractionType {
    return this._type;
  }

  public set type(value: InteractionType) {
    this._type = value;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public set createdAt(value: Date) {
    this._createdAt = value;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  public get question(): Question {
    return this._question;
  }

  public set question(value: Question) {
    this._question = value;
  }

  public get guest(): Guest {
    return this._guest;
  }

  public set guest(value: Guest) {
    this._guest = value;
  }

  public toJSON(): InteractionOptions {
    return {
      id: this._id.value,
      type: this._type,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      question: this._question,
      guest: this._guest,
    };
  }

  public clone(): Interaction {
    return new Interaction({
      id: this._id.value,
      type: this._type,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      question: this._question,
      guest: this._guest,
    });
  }

  public equals(other: Interaction): boolean {
    return (
      this._id.value === other._id.value &&
      this._type === other._type &&
      this._createdAt === other._createdAt &&
      this._updatedAt === other._updatedAt &&
      this._question === other._question &&
      this._guest === other._guest
    );
  }
}
