import { BadRequestException } from '@nestjs/common';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { Role, Roles } from '../value-objects/role.vo';
import { minLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { UUID } from '../value-objects/uuid.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { uuidv7 } from 'uuidv7';

export interface UserOptions {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Roles;
  employeeId?: string;
  jobTitle?: string;
  id?: string;
  employee?: Employee;
  supervisor?: Supervisor;
  admin?: Admin;
  driver?: Driver;
}

export class User {
  private _id: string;
  private _name: string;
  private _email: Email;
  private _username: string;
  private _password: Password;
  private _role: Role;
  private _employeeId?: string;
  private _jobTitle?: string;
  private _employee?: Employee;
  private _supervisor?: Supervisor;
  private _admin?: Admin;
  private _driver?: Driver;

  private constructor(
    id: string,
    name: string,
    email: Email,
    username: string,
    password: Password,
    role: Role,
    employeeId?: string,
    jobTitle?: string,
    employee?: Employee,
    supervisor?: Supervisor,
    admin?: Admin,
    driver?: Driver,
  ) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._username = username;
    this._password = password;
    this._role = role;
    this._employeeId = employeeId;
    this._jobTitle = jobTitle;
    this._employee = employee;
    this._supervisor = supervisor;
    this._admin = admin;
    this._driver = driver;
  }

  static async create(
    options: UserOptions,
    hashPassword: boolean = true,
  ): Promise<User> {
    const email = Email.create(options.email);
    const password = hashPassword
      ? await Password.fromPlain(options.password)
      : Password.fromHash(options.password);
    const role = Role.create(options.role);

    return new User(
      options.id || uuidv7(),
      options.name,
      email,
      options.username,
      password,
      role,
      options.employeeId,
      options.jobTitle,
      options.employee,
      options.supervisor,
      options.admin,
      options.driver,
    );
  }

  // ✅ Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get username(): string {
    return this._username;
  }

  get password(): Password {
    return this._password;
  }

  get role(): Role {
    return this._role;
  }

  get employeeId(): string | undefined {
    return this._employeeId;
  }

  get jobTitle(): string | undefined {
    return this._jobTitle;
  }

  get employee(): Employee | undefined {
    return this._employee;
  }

  get supervisor(): Supervisor | undefined {
    return this._supervisor;
  }

  get admin(): Admin | undefined {
    return this._admin;
  }

  get driver(): Driver | undefined {
    return this._driver;
  }

  // ✅ Setters with domain-level validation (optional)
  set name(newName: string) {
    if (!minLength(newName.trim(), 2)) {
      throw new BadRequestException({ name: 'invalid_name' });
    }
    this._name = newName;
  }

  set email(newEmail: Email) {
    this._email = newEmail;
  }

  set role(newRole: Role) {
    this._role = newRole;
  }

  set employeeId(value: string) {
    this._employeeId = value;
  }

  set jobTitle(value: string) {
    this._jobTitle = value;
  }

  set employee(value: Employee) {
    this._employee = value;
  }

  set supervisor(value: Supervisor) {
    this._supervisor = value;
  }

  set admin(value: Admin) {
    this._admin = value;
  }

  set driver(value: Driver) {
    this._driver = value;
  }

  set username(value: string) {
    this._username = value;
  }

  async changePassword(newPlain: string) {
    this._password = await Password.fromPlain(newPlain);
  }

  // ✅ Optional: expose serialized object
  toJSON(): any {
    return {
      id: this._id,
      name: this._name,
      email: this._email.toString(),
      username: this._username,
      password: this._password.toString(),
      role: this._role.getRole(),
      employeeId: this._employeeId,
      jobTitle: this._jobTitle,
      employee: this._employee?.toJSON(),
      supervisor: this._supervisor?.toJSON(),
      admin: this._admin?.toJSON(),
      driver: this._driver?.toJSON(),
    };
  }

  withoutPassword() {
    return {
      id: this._id,
      name: this._name,
      email: this._email.toString(),
      username: this._username,
      role: this._role.toString(),
      employeeId: this._employeeId,
      jobTitle: this._jobTitle,
      employee: this._employee?.toJSON(),
      supervisor: this._supervisor?.toJSON(),
      admin: this._admin?.toJSON(),
      driver: this._driver?.toJSON(),
    };
  }
}
