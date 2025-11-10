import { Department } from 'src/department/domain/entities/department.entity';
import { EmployeeRequest } from 'src/employee-request/domain/entities/employee-request.entity';
import { Promotion } from 'src/promotion/domain/entities/promotion.entity';
import { Question } from 'src/questions/domain/entities/question.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { Task } from 'src/task/domain/entities/task.entity';
import { User } from 'src/shared/entities/user.entity';

export enum SupervisorPermissionsEnum {
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  MANAGE_SUB_DEPARTMENTS = 'MANAGE_SUB_DEPARTMENTS',
  MANAGE_PROMOTIONS = 'MANAGE_PROMOTIONS',
  VIEW_USER_ACTIVITY = 'VIEW_USER_ACTIVITY',
  MANAGE_STAFF_DIRECTLY = 'MANAGE_STAFF_DIRECTLY',
  MANAGE_TASKS = 'MANAGE_TASKS',
  MANAGE_ATTACHMENT_GROUPS = 'MANAGE_ATTACHMENT_GROUPS',
}

interface SupervisorOptions {
  id: string;
  userId: string;
  user?: User;
  permissions: SupervisorPermissionsEnum[];
  departments: Department[];
  assignedTasks: Task[];
  employeeRequests: EmployeeRequest[];
  promotions: Promotion[];
  approvedTasks: Task[];
  questions: Question[];
  supportTicketAnswersAuthored: SupportTicketAnswer[];
  performedTasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export class Supervisor {
  private readonly _id: UUID;
  private _userId: UUID;
  private _user?: User;
  private _permissions: SupervisorPermissionsEnum[];
  private _departments: Department[];
  // private  _employees: Employee[];
  private _assignedTasks: Task[];
  private _employeeRequests: EmployeeRequest[];
  private _promotions: Promotion[];
  private _approvedTasks: Task[];
  private _questions: Question[];
  private _supportTicketAnswersAuthored: SupportTicketAnswer[];
  private _performedTasks: Task[];
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: SupervisorOptions) {
    this._id = UUID.create(options.id);
    this._userId = UUID.create(options.userId);
    this._user = options.user;
    this._permissions = options.permissions;
    this._departments = options.departments;
    this._assignedTasks = options.assignedTasks;
    this._employeeRequests = options.employeeRequests;
    this._promotions = options.promotions;
    this._approvedTasks = options.approvedTasks;
    this._questions = options.questions;
    this._supportTicketAnswersAuthored = options.supportTicketAnswersAuthored;
    this._performedTasks = options.performedTasks;
    this._createdAt = options.createdAt;
    this._updatedAt = options.updatedAt;
  }

  static create(options: SupervisorOptions): Supervisor {
    return new Supervisor(options);
  }

  get id(): UUID {
    return this._id;
  }

  get userId(): UUID {
    return this._userId;
  }

  get user(): User | undefined {
    return this._user;
  }

  get permissions(): SupervisorPermissionsEnum[] {
    return this._permissions;
  }

  get departments(): Department[] {
    return this._departments;
  }

  get assignedTasks(): Task[] {
    return this._assignedTasks;
  }

  get employeeRequests(): EmployeeRequest[] {
    return this._employeeRequests;
  }

  get promotions(): Promotion[] {
    return this._promotions;
  }

  get approvedTasks(): Task[] {
    return this._approvedTasks;
  }

  get questions(): Question[] {
    return this._questions;
  }

  get supportTicketAnswersAuthored(): SupportTicketAnswer[] {
    return this._supportTicketAnswersAuthored;
  }

  get performedTasks(): Task[] {
    return this._performedTasks;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set userId(value: UUID) {
    this._userId = value;
  }

  set user(value: User | undefined) {
    this._user = value;
  }

  set permissions(value: SupervisorPermissionsEnum[]) {
    this._permissions = value;
  }

  set departments(value: Department[]) {
    this._departments = value;
  }

  set assignedTasks(value: Task[]) {
    this._assignedTasks = value;
  }

  set employeeRequests(value: EmployeeRequest[]) {
    this._employeeRequests = value;
  }

  set promotions(value: Promotion[]) {
    this._promotions = value;
  }

  set approvedTasks(value: Task[]) {
    this._approvedTasks = value;
  }

  set questions(value: Question[]) {
    this._questions = value;
  }

  set supportTicketAnswersAuthored(value: SupportTicketAnswer[]) {
    this._supportTicketAnswersAuthored = value;
  }

  set performedTasks(value: Task[]) {
    this._performedTasks = value;
  }

  set createdAt(value: Date) {
    this._createdAt = value;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  toPersistence(): SupervisorPersistence {
    return {
      id: this.id.toString(),
      userId: this.userId.toString(),
      user: this.user,
      permissions: this.permissions,
      departments: this.departments,
      assignedTasks: this.assignedTasks,
      employeeRequests: this.employeeRequests,
      promotions: this.promotions,
      approvedTasks: this.approvedTasks,
      questions: this.questions,
      supportTicketAnswersAuthored: this.supportTicketAnswersAuthored,
      performedTasks: this.performedTasks,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromPersistence(data: SupervisorPersistence): Supervisor {
    return Supervisor.create({
      id: data.id,
      userId: data.userId,
      user: data.user,
      permissions: data.permissions,
      departments: data.departments,
      assignedTasks: data.assignedTasks,
      employeeRequests: data.employeeRequests,
      promotions: data.promotions,
      approvedTasks: data.approvedTasks,
      questions: data.questions,
      supportTicketAnswersAuthored: data.supportTicketAnswersAuthored,
      performedTasks: data.performedTasks,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  toJSON(): object {
    return {
      id: this.id.toString(),
      userId: this.userId.toString(),
      user: this?.user?.withoutPassword(),
      permissions: this.permissions,
      departments: this?.departments?.map((dept) =>
        typeof dept?.toJSON === 'function' ? dept.toJSON() : dept,
      ),
      assignedTasks: this?.assignedTasks?.map((task) =>
        typeof task?.toJSON === 'function' ? task.toJSON() : task,
      ),
      employeeRequests: this?.employeeRequests?.map((request) =>
        typeof request?.toJSON === 'function' ? request.toJSON() : request,
      ),
      promotions: this?.promotions?.map((promotion) =>
        typeof promotion?.toJSON === 'function'
          ? promotion.toJSON()
          : promotion,
      ),
      approvedTasks: this?.approvedTasks?.map((task) =>
        typeof task?.toJSON === 'function' ? task.toJSON() : task,
      ),
      questions: this?.questions?.map((question) =>
        typeof question?.toJSON === 'function' ? question.toJSON() : question,
      ),
      supportTicketAnswersAuthored: this?.supportTicketAnswersAuthored?.map(
        (answer) =>
          typeof answer?.toJSON === 'function' ? answer.toJSON() : answer,
      ),
      performedTasks: this?.performedTasks?.map((task) =>
        typeof task?.toJSON === 'function' ? task.toJSON() : task,
      ),
      createdAt: this?.createdAt?.toISOString(),
      updatedAt: this?.updatedAt?.toISOString(),
    };
  }
}

export interface SupervisorPersistence {
  id: string;
  userId: string;
  user: User;
  permissions: SupervisorPermissionsEnum[];
  departments: Department[];
  assignedTasks: Task[];
  employeeRequests: EmployeeRequest[];
  promotions: Promotion[];
  approvedTasks: Task[];
  questions: Question[];
  supportTicketAnswersAuthored: SupportTicketAnswer[];
  performedTasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}
