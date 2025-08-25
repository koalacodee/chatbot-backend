import { Question } from 'src/questions/domain/entities/question.entity';
import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupportTicketAnswer } from 'src/support-tickets/domain/entities/support-ticket-answer.entity';
import { SupportTicket } from 'src/support-tickets/domain/entities/support-ticket.entity';
import { Task } from 'src/task/domain/entities/task.entity';
import { Department } from 'src/department/domain/entities/department.entity';

export enum EmployeePermissions {
  HANDLE_TICKETS = 'HANDLE_TICKETS',
  HANDLE_TASKS = 'HANDLE_TASKS',
  ADD_FAQS = 'ADD_FAQS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  CLOSE_TICKETS = 'CLOSE_TICKETS',
}

export interface EmployeeProps {
  id?: string;
  userId: string;
  user?: User;
  permissions: EmployeePermissions[];
  supervisorId: string;
  supervisor?: Supervisor;
  subDepartments: Department[];
  supportTicketAnswersAssigned?: SupportTicket[];
  assigneeTasks?: Task[];
  questions?: Question[];
  supportTicketAnswersAuthored?: SupportTicketAnswer[];
  performerTasks?: Task[];
}

export class Employee {
  private readonly _id: UUID;
  private _userId: UUID;
  private _user?: User;
  private _permissions: EmployeePermissions[];
  private _supervisorId: UUID;
  private _supervisor?: Supervisor;
  private _subDepartments: Department[];
  private _supportTicketAnswersAssigned?: SupportTicket[];
  private _assigneeTasks?: Task[];
  private _questions?: Question[];
  private _supportTicketAnswersAuthored?: SupportTicketAnswer[];
  private _performerTasks?: Task[];

  private constructor(props: EmployeeProps) {
    this._id = UUID.create(props.id);
    this._userId = UUID.create(props.userId);
    this._user = props.user;
    this._permissions = props.permissions;
    this._supervisorId = UUID.create(props.supervisorId);
    this._supervisor = props.supervisor;
    this._subDepartments = props.subDepartments;
    this._supportTicketAnswersAssigned = props.supportTicketAnswersAssigned;
    this._assigneeTasks = props.assigneeTasks;
    this._questions = props.questions;
    this._supportTicketAnswersAuthored = props.supportTicketAnswersAuthored;
    this._performerTasks = props.performerTasks;
  }

  static async create(
    props: Omit<EmployeeProps, 'user'> & { user: any },
  ): Promise<Employee> {
    props.user = props.user
      ? props.user instanceof User
        ? props.user
        : await User.create(props.user)
      : undefined;
    return new Employee(props);
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

  get permissions(): EmployeePermissions[] {
    return this._permissions;
  }

  set permissions(value: EmployeePermissions[]) {
    this._permissions = value;
  }

  get supervisorId(): UUID {
    return this._supervisorId;
  }

  set supervisorId(value: UUID) {
    this._supervisorId = value;
  }

  get supervisor(): Supervisor | undefined {
    return this._supervisor;
  }

  set supervisor(value: Supervisor | undefined) {
    this._supervisor = value;
  }

  get subDepartments(): Department[] {
    return this._subDepartments;
  }

  set subDepartments(value: Department[]) {
    this._subDepartments = value;
  }

  get supportTicketAnswersAssigned(): SupportTicket[] | undefined {
    return this._supportTicketAnswersAssigned;
  }

  set supportTicketAnswersAssigned(value: SupportTicket[] | undefined) {
    this._supportTicketAnswersAssigned = value;
  }

  get assigneeTasks(): Task[] | undefined {
    return this._assigneeTasks;
  }

  set assigneeTasks(value: Task[] | undefined) {
    this._assigneeTasks = value;
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

  public toJSON() {
    return {
      id: this._id.value,
      userId: this._userId.value,
      user: this?._user?.withoutPassword(),
      permissions: this._permissions,
      supervisorId: this._supervisorId.value,
      supervisor: this._supervisor,
      subDepartments: this._subDepartments,
      supportTicketAnswersAssigned: this._supportTicketAnswersAssigned,
      assigneeTasks: this._assigneeTasks,
      questions: this._questions,
      supportTicketAnswersAuthored: this._supportTicketAnswersAuthored,
      performerTasks: this._performerTasks,
    };
  }

  public static async fromJSON(json: EmployeeProps): Promise<Employee> {
    return Employee.create({
      id: json.id,
      userId: json.userId,
      user: json.user,
      permissions: json.permissions,
      supervisorId: json.supervisorId,
      supervisor: json.supervisor,
      subDepartments: json.subDepartments,
      supportTicketAnswersAssigned: json.supportTicketAnswersAssigned,
      assigneeTasks: json.assigneeTasks,
      questions: json.questions,
      supportTicketAnswersAuthored: json.supportTicketAnswersAuthored,
      performerTasks: json.performerTasks,
    });
  }
}
