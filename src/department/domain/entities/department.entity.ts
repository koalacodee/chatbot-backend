import { KnowledgeChunk } from '../../../knowledge-chunks/domain/entities/knowledge-chunk.entity';
import { Question } from '../../../questions/domain/entities/question.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

export enum DepartmentVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

interface ConstructDepartmentOptions {
  id?: string;
  name: string;
  visibility?: DepartmentVisibility;
  questions?: Question[];
  knowledgeChunks?: KnowledgeChunk[];
  subDepartments?: Department[];
  parent?: Department;
}

export class Department {
  private readonly _id: UUID;
  private _name: string;
  private _visibility: DepartmentVisibility;
  private _questions: Question[];
  private _knowledgeChunks: KnowledgeChunk[];
  private _subDepartments?: Department[];
  private _parent?: Department;

  constructor({
    id,
    name,
    visibility = DepartmentVisibility.PUBLIC,
    questions,
    knowledgeChunks,
    subDepartments,
    parent,
  }: ConstructDepartmentOptions) {
    this._id = UUID.create(id);
    this._name = name;
    this._visibility = visibility;
    this._questions = questions || [];
    this._knowledgeChunks = knowledgeChunks || [];
    this._subDepartments = subDepartments || [];
    this._parent = parent;
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get visibility(): DepartmentVisibility {
    return this._visibility;
  }

  get questions(): Question[] {
    return [...this._questions];
  }

  get knowledgeChunks(): KnowledgeChunk[] {
    return [...this._knowledgeChunks];
  }

  get subDepartments(): Department[] {
    return [...this._subDepartments];
  }

  get parent(): Department | undefined {
    return this._parent;
  }

  // Setters
  set name(newName: string) {
    this._name = newName;
  }

  set visibility(newVisibility: DepartmentVisibility) {
    this._visibility = newVisibility;
  }

  set questions(newQuestions: Question[]) {
    this._questions = [...newQuestions];
  }

  set knowledgeChunks(newKnowledgeChunks: KnowledgeChunk[]) {
    this._knowledgeChunks = [...newKnowledgeChunks];
  }

  set subDepartments(newSubDepartments: Department[]) {
    this._subDepartments = [...newSubDepartments];
  }

  set parent(parent: Department) {
    this._parent = parent;
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

  public addSubDepartment(department: Department): void {
    this._subDepartments.push(department);
  }

  public removeSubDepartment(departmentId: UUID): void {
    this._subDepartments = this._subDepartments.filter(
      (d) => d.id.value !== departmentId.value,
    );
  }

  public findSubDepartmentById(departmentId: UUID): Department | undefined {
    return this._subDepartments.find((d) => d.id.value === departmentId.value);
  }

  public findQuestionById(questionId: UUID): Question | undefined {
    return this._questions.find((q) => q.id.value === questionId.value);
  }

  public findKnowledgeChunkById(chunkId: UUID): KnowledgeChunk | undefined {
    return this._knowledgeChunks.find((c) => c.id.value === chunkId.value);
  }

  public toJSON(): {
    id: string;
    name: string;
    visibility: DepartmentVisibility;
    questions: any[];
    knowledgeChunks: any[];
    subDepartments: any[];
    parent: any;
  } {
    return {
      id: this._id.toString(),
      name: this._name,
      visibility: this._visibility,
      questions: this._questions.map((q) => q.toJSON()),
      knowledgeChunks: this._knowledgeChunks.map((kc) => kc.toJSON()),
      subDepartments: this._subDepartments.map((d) => d.toJSON()),
      parent: this._parent?.toJSON(),
    };
  }

  public static create(options: ConstructDepartmentOptions): Department {
    return new Department(options);
  }
}
