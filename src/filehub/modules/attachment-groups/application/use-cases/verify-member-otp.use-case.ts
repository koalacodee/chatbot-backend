import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/shared/infrastructure/redis';
import { MemberRepository } from '../../domain/repositories/member.repository';

export interface VerifyMemberOtpUseCaseInput {
  authorizeOtp: string;
}

export interface VerifyMemberOtpUseCaseOutput {
  accessToken: string;
}

@Injectable()
export class VerifyMemberOtpUseCase {
  constructor(
    private readonly redisService: RedisService,
    private readonly memberRepository: MemberRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: VerifyMemberOtpUseCaseInput,
  ): Promise<VerifyMemberOtpUseCaseOutput> {
    const { authorizeOtp } = input;

    // Search for the member ID in Redis using the authorizeOtp
    const memberId = await this.redisService.get(
      `attachment-group:membership:auth:${authorizeOtp}`,
    );

    if (!memberId) {
      throw new NotFoundException('Invalid or expired authorization token');
    }

    // Verify the member exists in the database
    const member = await this.memberRepository.findById(memberId);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Generate JWT token
    const secret = this.configService.getOrThrow<string>(
      'ATTACHMENT_GROUP_MEMBER_ACCESS_TOKEN_SECRET',
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: member.id.toString() },
      {
        secret,
        expiresIn: '15d',
      },
    );

    // Clean up the OTP from Redis after successful verification
    await this.redisService.del(
      `attachment-group:membership:auth:${authorizeOtp}`,
    );

    return { accessToken };
  }
}
