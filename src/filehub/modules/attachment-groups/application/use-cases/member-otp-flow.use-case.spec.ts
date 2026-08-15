import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  InMemoryRedis,
  createInMemoryRedis,
} from 'src/common/__fixtures__/in-memory-redis';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { AttachmentGroupMember } from '../../domain/entities/member.entity';
import { MemberRepository } from '../../domain/repositories/member.repository';
import { AttachmentGroupMemberGateway } from '../../interface/websocket/member.gateway';
import { ReauthMemberUseCase } from './reauth-member.use-case';
import { RequestMembershipUseCase } from './request-membership.use-case';
import { VerifyMemberOtpUseCase } from './verify-member-otp.use-case';

const MEMBER_ID = '018f4a1e-1c7a-7000-8000-000000000c01';
const GROUP_ID = '018f4a1e-1c7a-7000-8000-000000000c02';
const OTHER_MEMBER_ID = '018f4a1e-1c7a-7000-8000-000000000c03';
const SECRET = 'test-member-access-secret';

const PAIRING_TTL_SECONDS = 1500;

const buildMember = (id = MEMBER_ID) =>
  AttachmentGroupMember.create({
    id,
    attachmentGroupId: GROUP_ID,
    name: 'Kiosk 3',
  });

/**
 * The three use-cases form one handshake and communicate only through Redis key formats
 * that nothing else checks:
 *
 *   1. a device asks for a pairing code   → `membership:{otp}` = '1'
 *   2. an operator claims it for a member → `membership:auth:{authOtp}` = memberId,
 *                                            pushed to the device over the socket
 *   3. the device redeems it              → a 15-day JWT
 *
 * Exercised against a single in-memory Redis so the keys have to line up for real; a
 * per-use-case double would let the formats drift apart silently.
 */
function build(members: AttachmentGroupMember[] = [buildMember()]) {
  const redis = createInMemoryRedis();
  const byId = new Map(members.map((m) => [m.id.value, m]));

  const emitted: Array<{ otp: string; authOtp: string }> = [];

  const memberRepository = stubRepository<MemberRepository>(
    'MemberRepository',
    { findById: async (id: string) => byId.get(id) ?? null },
  );

  const gateway = stubRepository<AttachmentGroupMemberGateway>(
    'AttachmentGroupMemberGateway',
    {
      emitMemberAuthorize: (otp: string, authOtp: string) => {
        emitted.push({ otp, authOtp });
      },
    },
  );

  const config = {
    getOrThrow: () => SECRET,
  } as unknown as ConfigService;

  return {
    redis,
    emitted,
    request: new RequestMembershipUseCase(redis.service),
    reauth: new ReauthMemberUseCase(memberRepository, gateway, redis.service),
    verify: new VerifyMemberOtpUseCase(
      redis.service,
      memberRepository,
      new JwtService({}),
      config,
    ),
  };
}

describe('member OTP flow', () => {
  describe('RequestMembershipUseCase', () => {
    it('returns a six digit code', async () => {
      const { request } = build();

      const otp = await request.execute();

      expect(otp).toMatch(/^\d{6}$/);
    });

    it('stores the code as a pending pairing with a 25 minute ttl', async () => {
      const { request, redis } = build();

      const otp = await request.execute();

      const key = `attachment-group:membership:${otp}`;
      expect(redis.strings.get(key)).toBe('1');
      expect(redis.ttls.get(key)).toBe(PAIRING_TTL_SECONDS);
    });

    it('issues a different code each time', async () => {
      const { request } = build();

      const codes = new Set(
        await Promise.all([
          request.execute(),
          request.execute(),
          request.execute(),
        ]),
      );

      expect(codes.size).toBeGreaterThan(1);
    });

    /**
     * The code carries no identity — it is a bearer pairing token, and any operator who
     * knows it can bind it to any member. What protects the flow is that step two requires
     * an authenticated operator, not the code itself.
     */
    it('records nothing about who the code is for', async () => {
      const { request, redis } = build();

      const otp = await request.execute();

      expect(redis.strings.get(`attachment-group:membership:${otp}`)).toBe('1');
    });
  });

  describe('ReauthMemberUseCase', () => {
    it('refuses an unknown pairing code', async () => {
      const { reauth } = build();

      await expect(
        reauth.execute({ otp: '123456', memberId: MEMBER_ID }),
      ).rejects.toThrow('Invalid OTP');
    });

    it('refuses a known code for an unknown member', async () => {
      const { request, reauth } = build();
      const otp = await request.execute();

      await expect(
        reauth.execute({ otp, memberId: OTHER_MEMBER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('stores an authorization token pointing at the member', async () => {
      const { request, reauth, redis, emitted } = build();
      const otp = await request.execute();

      await reauth.execute({ otp, memberId: MEMBER_ID });

      const { authOtp } = emitted[0];
      expect(
        redis.strings.get(`attachment-group:membership:auth:${authOtp}`),
      ).toBe(MEMBER_ID);
      expect(
        redis.ttls.get(`attachment-group:membership:auth:${authOtp}`),
      ).toBe(PAIRING_TTL_SECONDS);
    });

    it('pushes the authorization token to the room named by the pairing code', async () => {
      const { request, reauth, emitted } = build();
      const otp = await request.execute();

      await reauth.execute({ otp, memberId: MEMBER_ID });

      expect(emitted).toHaveLength(1);
      expect(emitted[0].otp).toBe(otp);
      expect(emitted[0].authOtp).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('burns the pairing code so it cannot be claimed twice', async () => {
      const { request, reauth, redis } = build();
      const otp = await request.execute();

      await reauth.execute({ otp, memberId: MEMBER_ID });

      expect(redis.strings.has(`attachment-group:membership:${otp}`)).toBe(
        false,
      );
      await expect(
        reauth.execute({ otp, memberId: MEMBER_ID }),
      ).rejects.toThrow('Invalid OTP');
    });

    it('leaves the pairing code intact when the member does not exist', async () => {
      const { request, reauth, redis } = build();
      const otp = await request.execute();

      await expect(
        reauth.execute({ otp, memberId: OTHER_MEMBER_ID }),
      ).rejects.toThrow();

      expect(redis.strings.has(`attachment-group:membership:${otp}`)).toBe(
        true,
      );
    });
  });

  describe('VerifyMemberOtpUseCase', () => {
    it('refuses an unknown authorization token', async () => {
      const { verify } = build();

      await expect(
        verify.execute({ authorizeOtp: 'nonsense' }),
      ).rejects.toThrow('Invalid or expired authorization token');
    });

    it('refuses when the token points at a member that no longer exists', async () => {
      const { verify, redis } = build();
      await redis.service.set(
        'attachment-group:membership:auth:orphan',
        OTHER_MEMBER_ID,
        PAIRING_TTL_SECONDS,
      );

      await expect(
        verify.execute({ authorizeOtp: 'orphan' }),
      ).rejects.toThrow('Member not found');
    });

    it('issues a token whose subject is the member id', async () => {
      const { request, reauth, verify, emitted } = build();
      const otp = await request.execute();
      await reauth.execute({ otp, memberId: MEMBER_ID });

      const { accessToken } = await verify.execute({
        authorizeOtp: emitted[0].authOtp,
      });

      const claims = new JwtService({}).verify(accessToken, { secret: SECRET });
      expect(claims.sub).toBe(MEMBER_ID);
    });

    it('signs with the configured member secret', async () => {
      const { request, reauth, verify, emitted } = build();
      const otp = await request.execute();
      await reauth.execute({ otp, memberId: MEMBER_ID });

      const { accessToken } = await verify.execute({
        authorizeOtp: emitted[0].authOtp,
      });

      expect(() =>
        new JwtService({}).verify(accessToken, { secret: 'wrong-secret' }),
      ).toThrow();
    });

    it('issues a fifteen day token', async () => {
      const { request, reauth, verify, emitted } = build();
      const otp = await request.execute();
      await reauth.execute({ otp, memberId: MEMBER_ID });

      const { accessToken } = await verify.execute({
        authorizeOtp: emitted[0].authOtp,
      });

      const claims = new JwtService({}).verify(accessToken, { secret: SECRET });
      expect(claims.exp - claims.iat).toBe(15 * 24 * 60 * 60);
    });

    it('burns the authorization token so it cannot be redeemed twice', async () => {
      const { request, reauth, verify, emitted } = build();
      const otp = await request.execute();
      await reauth.execute({ otp, memberId: MEMBER_ID });
      const { authOtp } = emitted[0];

      await verify.execute({ authorizeOtp: authOtp });

      await expect(verify.execute({ authorizeOtp: authOtp })).rejects.toThrow(
        'Invalid or expired authorization token',
      );
    });
  });

  describe('the handshake end to end', () => {
    it('pairs a device and authenticates it as the intended member', async () => {
      const { request, reauth, verify, emitted, redis } = build();

      // 1. device asks for a code
      const otp = await request.execute();

      // 2. an operator claims it for a member
      const member = await reauth.execute({ otp, memberId: MEMBER_ID });
      expect(member.id.value).toBe(MEMBER_ID);

      // 3. the device redeems what it was pushed
      const { accessToken } = await verify.execute({
        authorizeOtp: emitted[0].authOtp,
      });

      const claims = new JwtService({}).verify(accessToken, { secret: SECRET });
      expect(claims.sub).toBe(MEMBER_ID);

      // both single-use keys are gone
      expect(redis.strings.size).toBe(0);
    });

    /**
     * Nothing binds the pairing code to a particular member — the operator supplies the
     * member id at claim time — so the same code can authenticate whichever member the
     * claiming operator names.
     */
    it('authenticates whichever member the operator names, not one fixed at request time', async () => {
      const { request, reauth, verify, emitted } = build([
        buildMember(),
        buildMember(OTHER_MEMBER_ID),
      ]);

      const otp = await request.execute();
      await reauth.execute({ otp, memberId: OTHER_MEMBER_ID });

      const { accessToken } = await verify.execute({
        authorizeOtp: emitted[0].authOtp,
      });

      const claims = new JwtService({}).verify(accessToken, { secret: SECRET });
      expect(claims.sub).toBe(OTHER_MEMBER_ID);
    });
  });
});
