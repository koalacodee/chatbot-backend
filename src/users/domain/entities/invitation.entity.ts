import { Email } from 'src/shared/value-objects/email.vo';
import { Token } from '../value-objects/token.vo';
import { Role, Roles } from 'src/shared/value-objects/role.vo';

interface CreateInvitationOptions {
  name: string;
  email: string;
  role: Roles;
}

export class Invitation {
  private constructor(
    private _name: string,
    private _email: Email,
    private _token: Token,
    private _role: Role,
  ) {}

  static create({ name, email, role }: CreateInvitationOptions) {
    return new Invitation(
      name,
      Email.create(email),
      new Token(),
      Role.create(role),
    );
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get token(): Token {
    return this._token;
  }

  get role(): Role {
    return this._role;
  }

  // Setters
  set name(newName: string) {
    this._name = newName;
  }

  set email(newEmail: string) {
    this._email = Email.create(newEmail);
  }

  toJSON() {
    return {
      name: this._name,
      email: this._email.toString(),
      token: this._token.toString(),
      role: this._role.toString(),
    };
  }
}
