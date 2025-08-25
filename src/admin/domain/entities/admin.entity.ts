import { EmployeeRequest } from 'src/employee-request/domain/entities/employee-request.entity';
import { Promotion } from 'src/promotion/domain/entities/promotion.entity';
import { Question } from 'src/questions/domain/entities/question.entity';
import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { Task } from 'src/task/domain/entities/task.entity';

interface AdminProps {
  id?: string;
  userId: string;
  user?: User;
  promotions?: Promotion[];
  approvedTasks?: Task[];
  adminResolutions?: EmployeeRequest[];
  questions?: Question[];
  supportTicketAnswersAuthored?: SupportTicketAnswer[];
  performerTasks?: Task[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Admin {
  private readonly _id: UUID;
  private _userId: UUID;
  private _user?: User;
  private _promotions?: Promotion[];
  private _approvedTasks?: Task[];
  private _adminResolutions?: EmployeeRequest[];
  private _questions?: Question[];
  private _supportTicketAnswersAuthored?: SupportTicketAnswer[];
  private _performerTasks?: Task[];

  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: AdminProps) {
    this._id = UUID.create(props.id);
    this._userId = UUID.create(props.userId);
    this._user = props.user;
    this._promotions = props.promotions;
    this._approvedTasks = props.approvedTasks;
    this._adminResolutions = props.adminResolutions;
    this._questions = props.questions;
    this._supportTicketAnswersAuthored = props.supportTicketAnswersAuthored;
    this._performerTasks = props.performerTasks;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: AdminProps): Admin {
    return new Admin(props);
  }

  get id(): UUID {
    return this._id;
  }

  get userId(): UUID {
    return this._userId;
  }

  set userId(value: UUID) {
    this._userId = value;
  }

  get user(): User | undefined {
    return this._user;
  }

  set user(value: User | undefined) {
    this._user = value;
  }

  get promotions(): Promotion[] | undefined {
    return this._promotions;
  }

  set promotions(value: Promotion[] | undefined) {
    this._promotions = value;
  }

  get approvedTasks(): Task[] | undefined {
    return this._approvedTasks;
  }

  set approvedTasks(value: Task[] | undefined) {
    this._approvedTasks = value;
  }

  get adminResolutions(): EmployeeRequest[] | undefined {
    return this._adminResolutions;
  }

  set adminResolutions(value: EmployeeRequest[] | undefined) {
    this._adminResolutions = value;
  }

  get questions(): Question[] | undefined {
    return this._questions;
  }

  set questions(value: Question[] | undefined) {
    this._questions = value;
  }

  get supportTicketAnswersAuthored(): SupportTicketAnswer[] | undefined {
    return this._supportTicketAnswersAuthored;
  }

  set supportTicketAnswersAuthored(value: SupportTicketAnswer[] | undefined) {
    this._supportTicketAnswersAuthored = value;
  }

  get performerTasks(): Task[] | undefined {
    return this._performerTasks;
  }

  set performerTasks(value: Task[] | undefined) {
    this._performerTasks = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toJSON(): any {
    return {
      id: this._id.value,
      userId: this._userId.value,
      user: this._user?.withoutPassword(),
      promotions: this._promotions?.map((promotion) => promotion.toJSON()),
      approvedTasks: this._approvedTasks?.map((task) => task.toJSON()),
      adminResolutions: this._adminResolutions?.map((request) =>
        request.toJSON(),
      ),
      questions: this._questions?.map((question) => question.toJSON()),
      supportTicketAnswersAuthored: this._supportTicketAnswersAuthored?.map(
        (answer) => answer.toJSON(),
      ),
      performerTasks: this._performerTasks?.map((task) => task.toJSON()),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  static fromJSON(props: AdminProps): Admin {
    return Admin.create(props);
  }
}
