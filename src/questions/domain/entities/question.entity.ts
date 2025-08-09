import { UUID } from 'src/shared/value-objects/uuid.vo';

interface ConstructQuestionOptions {
  id?: string;
  text: string;
  departmentId: string;
  answer?: string;
  knowledgeChunkId?: string;
}

export class Question {
  private readonly _id: UUID;
  private _text: string;
  private _departmentId: UUID;
  private _answer: string;
  private _knowledgeChunkId?: UUID;

  private constructor({
    id,
    text,
    departmentId,
    knowledgeChunkId,
    answer,
  }: ConstructQuestionOptions) {
    this._id = UUID.create(id);
    this._text = text;
    this._answer = answer;
    this._departmentId = UUID.create(departmentId);
    this._knowledgeChunkId = knowledgeChunkId
      ? UUID.create(knowledgeChunkId)
      : undefined;
  }

  public static create(options: ConstructQuestionOptions): Question {
    return new Question(options);
  }

  get id(): UUID {
    return this._id;
  }

  get text(): string {
    return this._text;
  }

  set text(newText: string) {
    this._text = newText;
  }

  get departmentId(): UUID {
    return this._departmentId;
  }

  set departmentId(newDepartmentId: UUID) {
    this._departmentId = newDepartmentId;
  }

  get knowledgeChunkId(): UUID | undefined {
    return this._knowledgeChunkId;
  }

  set knowledgeChunkId(newKnowledgeChunkId: UUID | undefined) {
    this._knowledgeChunkId = newKnowledgeChunkId;
  }

  get answer(): string {
    return this._answer;
  }

  set answer(newAnswer: string) {
    this._answer = newAnswer;
  }

  toJSON() {
    return {
      id: this._id.value,
      text: this._text,
      departmentId: this._departmentId.value,
      knowledgeChunkId: this._knowledgeChunkId
        ? this._knowledgeChunkId.value
        : undefined,
      answer: this.answer,
    };
  }
}
