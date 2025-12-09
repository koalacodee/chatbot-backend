import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MemberRepository } from '../../../domain/repositories/member.repository';

@Injectable()
export class MemberJwtStrategy extends PassportStrategy(
  Strategy,
  'member-jwt',
) {
  constructor(
    private readonly memberRepo: MemberRepository,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req.cookies['attachment_group_member_token'],
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow(
        'ATTACHMENT_GROUP_MEMBER_ACCESS_TOKEN_SECRET',
      ), // Use environment variable in production
    });
  }

  async validate(payload: any) {
    console.log(payload);
    // Only handle authenticated users (not guests)
    const member = await this.memberRepo.findById(payload.sub);

    if (!member) {
      throw new UnauthorizedException({
        details: [{ field: 'memberId', message: 'Member not found' }],
      });
    }

    // Return user data that will be attached to the request object
    return {
      id: member.id.toString(),
      name: member.name.toString(),
      attachmentGroupId: member.attachmentGroupId.toString(),
    };
  }
}
