import { BadRequestException } from '@nestjs/common';

export enum Roles {
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  DRIVER = 'DRIVER',
  GUEST = 'GUEST',
}

export class Role {
  private constructor(private role: Roles) {}

  static create(role: string): Role {
    role = role.toUpperCase();
    if (!Object.values(Roles).includes(role as Roles)) {
      throw new BadRequestException({
        details: [{ field: 'role', message: 'Role is invalid' }],
      });
    }

    return new Role(role as Roles);
  }

  public getRole(): Roles {
    return this.role;
  }

  public toString(): string {
    return this.role;
  }
}
