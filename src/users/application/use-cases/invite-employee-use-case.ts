import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendEmailService } from 'src/shared/infrastructure/email';
import InviteEmployeeEmail, {
  InviteEmployeeEmailProps,
} from 'src/shared/infrastructure/email/InviteEmployeeEmail';
import { RedisService } from 'src/shared/infrastructure/redis';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Invitation } from 'src/users/domain/entities/invitation.entity';

export interface InviteUserInput {
  name: string;
  email: string;
  role: Roles;
  expiresIn?: Date;
}

@Injectable()
export class InviteEmployeeUseCase {
  constructor(
    private readonly redis: RedisService,
    private readonly email: ResendEmailService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: InviteUserInput) {
    const invitation = Invitation.create(input);
    await this.redis.set(
      `invite:${invitation.token.toString()}`,
      JSON.stringify(invitation),
      input.expiresIn
        ? (input.expiresIn.getTime() - Date.now()) / 1000
        : undefined,
    );

    await this.email.sendReactEmail<InviteEmployeeEmailProps>(
      invitation.email.toString(),
      'Job Invitation',
      InviteEmployeeEmail,
      {
        token: invitation.token.toString(),
        name: invitation.name,
        baseUrl: `${this.config.get('BASE_URL')}/invite/accept`,
      },
    );

    return null;
  }
}
