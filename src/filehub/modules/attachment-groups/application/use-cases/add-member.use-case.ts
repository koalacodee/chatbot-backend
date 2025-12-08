import { Injectable } from '@nestjs/common';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { AttachmentGroupMemberGateway } from '../../interface/websocket/member.gateway';
import { AttachmentGroupRepository } from 'src/attachment-group/domain/repositories/attachment-group.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { AttachmentGroupMember } from '../../domain/entities/member.entity';
import { randomBytes, randomInt } from 'crypto';
export interface AddMemberUseCaseInput {
  otp: string;
  name: string;
  attachmentGroupId: string;
}

@Injectable()
export class AddMemberUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly attachmentGroupMemberGateway: AttachmentGroupMemberGateway,
    private readonly attachmentGroupRepository: AttachmentGroupRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(input: AddMemberUseCaseInput) {
    const { otp, name, attachmentGroupId } = input;

    const redisAck = await this.redisService.get(
      `attachment-group:membership:${otp}`,
    );

    if (!redisAck) {
      throw new Error('Invalid OTP');
    }

    const attachmentGroup =
      await this.attachmentGroupRepository.findById(attachmentGroupId);

    if (!attachmentGroup) {
      throw new Error('Attachment group not found');
    }

    const member = AttachmentGroupMember.create({
      name,
      attachmentGroupId,
      memberId: attachmentGroup.id,
    });

    await this.memberRepository.save(member);
    const authorizeOtp = randomBytes(32).toString('base64url');

    await this.redisService.set(
      `attachment-group:membership:auth:${authorizeOtp}`,
      member.id.toString(),
      1500,
    );
    this.attachmentGroupMemberGateway.emitMemberAuthorize(otp, authorizeOtp);
    await this.redisService.del(`attachment-group:membership:${otp}`);

    return member;
  }
}
