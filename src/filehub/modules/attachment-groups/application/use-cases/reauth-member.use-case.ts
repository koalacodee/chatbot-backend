import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { AttachmentGroupMemberGateway } from '../../interface/websocket/member.gateway';
import { RedisService } from 'src/shared/infrastructure/redis';
import { randomBytes } from 'crypto';

export interface ReauthMemberUseCaseInput {
  otp: string;
  memberId: string;
}

@Injectable()
export class ReauthMemberUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly attachmentGroupMemberGateway: AttachmentGroupMemberGateway,
    private readonly redisService: RedisService,
  ) {}

  async execute(input: ReauthMemberUseCaseInput) {
    const { otp, memberId } = input;

    const redisAck = await this.redisService.get(
      `attachment-group:membership:${otp}`,
    );

    if (!redisAck) {
      throw new Error('Invalid OTP');
    }

    const member = await this.memberRepository.findById(memberId);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const authorizeOtp = randomBytes(32).toString('base64url');

    await this.redisService.set(
      `attachment-group:membership:auth:${authorizeOtp}`,
      member.id.toString(),
      1500,
    );
    this.attachmentGroupMemberGateway.emitMemberAuthorize(
      String(otp),
      authorizeOtp,
    );
    await this.redisService.del(`attachment-group:membership:${otp}`);

    return member;
  }
}
