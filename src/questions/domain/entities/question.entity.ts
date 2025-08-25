import { Department } from 'src/department/domain/entities/department.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface ConstructQuestionOptions {
  id?: string;
  text: string;
  departmentId: string;
  answer?: string;
  knowledgeChunkId?: string;
  creatorAdminId?: string;
  creatorSupervisorId?: string;
  creatorEmployeeId: string;
  department?: Department;
  satisfaction?: number;
  dissatisfaction?: number;
  views?: number;
}

export class Question {
  private readonly _id: UUID;
  private _text: string;
  private _departmentId: UUID;
  private _answer: string;
  private _knowledgeChunkId?: UUID;
  private _creatorAdminId?: UUID;
  private _creatorSupervisorId?: UUID;
  private _creatorEmployeeId: UUID;
  private _department?: Department;
  private _satisfaction: number;
  private _dissatisfaction: number;
  private _views: number;

  private constructor({
    id,
    text,
    departmentId,
    knowledgeChunkId,
    answer,
    creatorEmployeeId,
    creatorAdminId,
    creatorSupervisorId,
    department,
    satisfaction,
    dissatisfaction,
    views,
  }: ConstructQuestionOptions) {
    this._id = UUID.create(id);
    this._text = text;
    this._answer = answer;
    this._departmentId = UUID.create(departmentId);
    this._knowledgeChunkId = knowledgeChunkId
      ? UUID.create(knowledgeChunkId)
      : undefined;
    this._creatorAdminId = creatorAdminId
      ? UUID.create(creatorAdminId)
      : undefined;
    this._creatorSupervisorId = creatorSupervisorId
      ? UUID.create(creatorSupervisorId)
      : undefined;
    this._creatorEmployeeId = creatorEmployeeId
      ? UUID.create(creatorEmployeeId)
      : undefined;
    this._department = department;
    this._satisfaction = satisfaction ?? 0;
    this._dissatisfaction = dissatisfaction ?? 0;
    this._views = views ?? 0;
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

  get department(): Department | undefined {
    return this._department;
  }

  set department(newDepartment: Department | undefined) {
    this._department = newDepartment;
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

  get creatorAdminId(): UUID | undefined {
    return this._creatorAdminId;
  }

  set creatorAdminId(newCreatorAdminId: UUID | undefined) {
    this._creatorAdminId = newCreatorAdminId;
  }

  get creatorEmployeeId(): UUID | undefined {
    return this._creatorEmployeeId;
  }

  set creatorEmployeeId(newCreatorAdminId: UUID | undefined) {
    this._creatorEmployeeId = newCreatorAdminId;
  }

  get creatorSupervisorId(): UUID | undefined {
    return this._creatorSupervisorId;
  }

  set creatorSupervisorId(newCreatorAdminId: UUID | undefined) {
    this._creatorSupervisorId = newCreatorAdminId;
  }

  get satisfaction(): number | undefined {
    return this._satisfaction;
  }

  set satisfaction(newSatisfaction: number | undefined) {
    this._satisfaction = newSatisfaction;
  }

  get dissatisfaction(): number | undefined {
    return this._dissatisfaction;
  }

  set dissatisfaction(newDissatisfaction: number | undefined) {
    this._dissatisfaction = newDissatisfaction;
  }

  get views(): number | undefined {
    return this._views;
  }

  set views(newViews: number | undefined) {
    this._views = newViews;
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
      creatorAdminId: this._creatorAdminId
        ? this._creatorAdminId.value
        : undefined,
      creatorSupervisorId: this._creatorSupervisorId
        ? this._creatorSupervisorId.value
        : undefined,
      creatorEmployeeId: this._creatorEmployeeId
        ? this._creatorEmployeeId.value
        : undefined,
      department: this.department,
      satisfaction: this.satisfaction,
      dissatisfaction: this.dissatisfaction,
      views: this.views,
    };
  }
}
