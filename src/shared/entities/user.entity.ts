import { BadRequestException } from '@nestjs/common';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { Role, Roles } from '../value-objects/role.vo';
import { minLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { UUID } from '../value-objects/uuid.vo';

export interface UserOptions {
  name: string;
  email: string;
  password: string;
  role: Roles;
  departmentId?: string;
  id?: string;
}

export class User {
  private _id: string;
  private _name: string;
  private _email: Email;
  private _password: Password;
  private _role: Role;
  private _departmentId?: UUID;

  private constructor(
    id: string,
    name: string,
    email: Email,
    password: Password,
    role: Role,
    departmentId?: UUID,
  ) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._password = password;
    this._role = role;
    this._departmentId = departmentId;
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
      options.id || randomUUID(),
      options.name,
      email,
      password,
      role,
      options.departmentId ? UUID.create(options.departmentId) : undefined,
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

  get password(): Password {
    return this._password;
  }

  get role(): Role {
    return this._role;
  }

  get departmentId(): UUID | undefined {
    return this._departmentId;
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

  set departmentId(newDepartmentId: UUID | undefined) {
    this._departmentId = newDepartmentId;
  }

  async changePassword(oldPlain: string, newPlain: string) {
    await this._password.verify(oldPlain);

    this._password = await Password.fromPlain(newPlain);
  }

  // ✅ Optional: expose serialized object
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      email: this._email.toString(),
      password: this._password.toString(),
      role: this._role.toString(),
      departmentId: this._departmentId,
    };
  }
}
