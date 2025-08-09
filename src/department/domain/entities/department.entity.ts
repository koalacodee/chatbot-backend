import { KnowledgeChunk } from '../../../knowledge-chunks/domain/entities/knowledge-chunk.entity';
import { Question } from '../../../questions/domain/entities/question.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface ConstructDepartmentOptions {
  id?: string;
  name: string;
  questions?: Question[];
  knowledgeChunks?: KnowledgeChunk[];
}

export class Department {
  private readonly _id: UUID;
  private _name: string;
  private _questions: Question[];
  private _knowledgeChunks: KnowledgeChunk[];

  constructor({
    id = undefined,
    name,
    questions,
    knowledgeChunks,
  }: ConstructDepartmentOptions) {
    this._id = UUID.create(id);
    this._name = name;
    this._questions = questions || [];
    this._knowledgeChunks = knowledgeChunks || [];
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get questions(): Question[] {
    return [...this._questions];
  }

  get knowledgeChunks(): KnowledgeChunk[] {
    return [...this._knowledgeChunks];
  }

  // Setters
  set name(newName: string) {
    this._name = newName;
  }

  set questions(newQuestions: Question[]) {
    this._questions = [...newQuestions];
  }

  set knowledgeChunks(newKnowledgeChunks: KnowledgeChunk[]) {
    this._knowledgeChunks = [...newKnowledgeChunks];
  }

  // Utility methods

  public addQuestion(question: Question): void {
    this._questions.push(question);
  }

  public removeQuestion(questionId: UUID): void {
    this._questions = this._questions.filter(
      (q) => q.id.value !== questionId.value,
    );
  }

  public addKnowledgeChunk(chunk: KnowledgeChunk): void {
    this._knowledgeChunks.push(chunk);
  }

  public removeKnowledgeChunk(chunkId: UUID): void {
    this._knowledgeChunks = this._knowledgeChunks.filter(
      (c) => c.id.value !== chunkId.value,
    );
  }

  public findQuestionById(questionId: UUID): Question | undefined {
    return this._questions.find((q) => q.id.value === questionId.value);
  }

  public findKnowledgeChunkById(chunkId: UUID): KnowledgeChunk | undefined {
    return this._knowledgeChunks.find((c) => c.id.value === chunkId.value);
  }

  public toJSON(): object {
    return {
      id: this._id.toString(),
      name: this._name,
      questions: this._questions.map((q) => q.toJSON()),
      knowledgeChunks: this._knowledgeChunks.map((kc) => kc.toJSON()),
    };
  }

  public static create(options: ConstructDepartmentOptions): Department {
    return new Department(options);
  }
}
