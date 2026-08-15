import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import {
  InMemoryRedis,
  createInMemoryRedis,
} from 'src/common/__fixtures__/in-memory-redis';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { ResendEmailService } from 'src/shared/infrastructure/email';
import { LoginGuestUseCase } from './login-guest.use-case';
import {
  GUEST_VERIFICATION_CODE_TTL_SECONDS,
  loginKey,
  registrationKey,
} from '../guest-verification.constants';
import { RegisterGuestUseCase } from './register-guest.use-case';
import { VerifyLoginUseCase } from './verify-login.use-case';
import { VerifyRegisterUseCase } from './verify-register.use-case';

const GUEST_ID = '018f4a1e-1c7a-7000-8000-000000000d01';
const OTHER_GUEST_ID = '018f4a1e-1c7a-7000-8000-000000000d02';

const buildGuest = (id = GUEST_ID, email = 'dana@example.com') =>
  Guest.create({ id, name: 'Dana', email, phone: '+441234567890' });

interface Options {
  guests?: Guest[];
  existsByEmail?: boolean;
  existsByPhone?: boolean;
}

function build(options: Options = {}) {
  const redis = createInMemoryRedis();
  const guests = options.guests ?? [];
  const byId = new Map(guests.map((g) => [g.id.value, g]));

  const saved: Guest[] = [];
  const emails: Array<{ to: string; subject: string; props: any }> = [];

  const guestRepo = stubRepository<GuestRepository>('GuestRepository', {
    existsByEmail: async () => options.existsByEmail ?? false,
    existsByPhone: async () => options.existsByPhone ?? false,
    findById: async (id: string) => byId.get(id) ?? null,
    findByEmail: async (email: string) =>
      guests.find((g) => g.email.getValue() === email) ?? null,
    findByPhone: async (phone: string) =>
      guests.find((g) => g.phone === phone) ?? null,
    save: async (guest: Guest) => {
      saved.push(guest);
      return guest;
    },
  });

  const email = {
    sendReactEmail: async (to: string, subject: string, _tpl: any, props: any) => {
      emails.push({ to, subject, props });
    },
  } as unknown as ResendEmailService;

  const tokens = stubRepository<TokensService>('TokensService', {
    generateTokens: async (id: string, subject: string) => ({
      accessToken: `access:${id}:${subject}`,
      refreshToken: `refresh:${id}`,
    }),
  });

  return {
    redis,
    saved,
    emails,
    register: new RegisterGuestUseCase(guestRepo, redis.service, email),
    verifyRegister: new VerifyRegisterUseCase(guestRepo, redis.service, tokens),
    login: new LoginGuestUseCase(guestRepo, email, redis.service),
    verifyLogin: new VerifyLoginUseCase(redis.service, tokens, guestRepo),
  };
}

/** The six-digit code the use-case emailed. */
const sentCode = (emails: Array<{ props: any }>) => emails[0].props.code;

describe('guest auth flow', () => {
  describe('RegisterGuestUseCase', () => {
    it('refuses an email already registered', async () => {
      const { register } = build({ existsByEmail: true });

      await expect(
        register.execute({ name: 'Dana', email: 'dana@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses a phone already registered', async () => {
      const { register } = build({ existsByPhone: true });

      await expect(
        register.execute({
          name: 'Dana',
          email: 'new@example.com',
          phone: '+441234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('skips the phone check when no phone is given', async () => {
      const { register } = build({ existsByPhone: true });

      await expect(
        register.execute({ name: 'Dana', email: 'dana@example.com' }),
      ).resolves.toBeDefined();
    });

    it('emails a six digit code', async () => {
      const { register, emails } = build();

      await register.execute({ name: 'Dana', email: 'dana@example.com' });

      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe('dana@example.com');
      expect(sentCode(emails)).toMatch(/^\d{6}$/);
    });

    it('parks the unsaved guest in redis keyed by guest id, code inside', async () => {
      const { register, emails, redis } = build();

      const { guest } = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });

      const parked = redis.strings.get(registrationKey(guest.id));
      expect(JSON.parse(parked!)).toMatchObject({
        code: sentCode(emails),
        guest: { name: 'Dana' },
      });
    });

    it('does not persist the guest until the code is verified', async () => {
      const { register, saved } = build();

      await register.execute({ name: 'Dana', email: 'dana@example.com' });

      expect(saved).toHaveLength(0);
    });

    it('returns the guest without its password', async () => {
      const { register } = build();

      const result = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });

      expect(result.guest).toMatchObject({ name: 'Dana' });
      expect(result.guest).not.toHaveProperty('password');
    });

    it('expires the registration code after 25 minutes', async () => {
      const { register, redis } = build();

      const { guest } = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });

      expect(redis.ttls.get(registrationKey(guest.id))).toBe(
        GUEST_VERIFICATION_CODE_TTL_SECONDS,
      );
    });
  });

  describe('LoginGuestUseCase', () => {
    it('finds the guest by email when the identifier looks like one', async () => {
      const { login, emails } = build({ guests: [buildGuest()] });

      await login.execute({ identifier: 'dana@example.com' });

      expect(emails[0].to).toBe('dana@example.com');
    });

    it('falls back to phone lookup for a non-email identifier', async () => {
      const { login, emails } = build({ guests: [buildGuest()] });

      await login.execute({ identifier: '+441234567890' });

      // The code still goes to the guest's email, whichever identifier was used.
      expect(emails[0].to).toBe('dana@example.com');
    });

    it('rejects an unknown identifier', async () => {
      const { login } = build();

      await expect(
        login.execute({ identifier: 'nobody@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('maps the code to the guest id in redis', async () => {
      const { login, emails, redis } = build({ guests: [buildGuest()] });

      await login.execute({ identifier: 'dana@example.com' });

      expect(redis.strings.get(loginKey(GUEST_ID))).toBe(sentCode(emails));
    });

    it('expires the login code after 25 minutes', async () => {
      const { login, emails, redis } = build({ guests: [buildGuest()] });

      await login.execute({ identifier: 'dana@example.com' });

      expect(redis.ttls.get(loginKey(GUEST_ID))).toBe(
        GUEST_VERIFICATION_CODE_TTL_SECONDS,
      );
    });
  });

  describe('VerifyRegisterUseCase', () => {
    it('rejects an unknown guest', async () => {
      const { verifyRegister } = build();

      await expect(
        verifyRegister.execute(GUEST_ID, '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a wrong code for a real pending registration', async () => {
      const { register, verifyRegister } = build();
      const { guest } = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });

      await expect(
        verifyRegister.execute(guest.id, '000000'),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists the parked guest and issues tokens', async () => {
      const { register, verifyRegister, emails, saved } = build();
      const { guest } = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });

      const result = await verifyRegister.execute(guest.id, sentCode(emails));

      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Dana');
      expect(result.tokens.accessToken).toContain('access:');
    });

    it('burns the entry so it cannot be redeemed twice', async () => {
      const { register, verifyRegister, emails, redis } = build();
      const { guest } = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });
      const code = sentCode(emails);

      await verifyRegister.execute(guest.id, code);

      expect(redis.strings.has(registrationKey(guest.id))).toBe(false);
      await expect(verifyRegister.execute(guest.id, code)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('VerifyLoginUseCase', () => {
    it('rejects an unknown guest', async () => {
      const { verifyLogin } = build();

      await expect(verifyLogin.execute(GUEST_ID, '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a wrong code for a guest with a live one', async () => {
      const { login, verifyLogin } = build({ guests: [buildGuest()] });
      await login.execute({ identifier: 'dana@example.com' });

      await expect(verifyLogin.execute(GUEST_ID, '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('issues tokens for the guest that owns the code', async () => {
      const { login, verifyLogin, emails } = build({ guests: [buildGuest()] });
      const { guestId } = await login.execute({
        identifier: 'dana@example.com',
      });

      const result = await verifyLogin.execute(guestId, sentCode(emails));

      expect(result.guest.id).toBe(GUEST_ID);
      expect(result.tokens.accessToken).toBe(
        `access:${GUEST_ID}:dana@example.com`,
      );
    });

    it('burns the code so it cannot be redeemed twice', async () => {
      const { login, verifyLogin, emails, redis } = build({
        guests: [buildGuest()],
      });
      const { guestId } = await login.execute({
        identifier: 'dana@example.com',
      });
      const code = sentCode(emails);

      await verifyLogin.execute(guestId, code);

      expect(redis.strings.has(loginKey(guestId))).toBe(false);
      await expect(verifyLogin.execute(guestId, code)).rejects.toThrow(
        BadRequestException,
      );
    });

    /**
     * The code is burned before the guest is loaded, so a guest deleted in between has to
     * read as an unusable code — a 400 — rather than a TypeError on `.toJSON()`.
     */
    it('rejects with 400 when the guest behind the code is gone', async () => {
      const { verifyLogin, redis } = build();
      await redis.service.set(loginKey(OTHER_GUEST_ID), '123456');

      await expect(
        verifyLogin.execute(OTHER_GUEST_ID, '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('still burns the code when the guest is gone', async () => {
      const { verifyLogin, redis } = build();
      await redis.service.set(loginKey(OTHER_GUEST_ID), '123456');

      await expect(
        verifyLogin.execute(OTHER_GUEST_ID, '123456'),
      ).rejects.toThrow();

      expect(redis.strings.has(loginKey(OTHER_GUEST_ID))).toBe(false);
    });
  });

  /**
   * The reason keys are scoped by guest rather than by code. Previously a shared code
   * meant the second guest's write replaced the first's, and the first guest's code then
   * authenticated them as the second.
   */
  describe('code collisions between guests', () => {
    it('keeps two guests holding the same code entirely separate', async () => {
      const { verifyLogin, redis } = build({
        guests: [buildGuest(), buildGuest(OTHER_GUEST_ID, 'sam@example.com')],
      });

      await redis.service.set(loginKey(GUEST_ID), '123456');
      await redis.service.set(loginKey(OTHER_GUEST_ID), '123456');

      // Each guest redeems their own entry and gets themselves back.
      await expect(
        verifyLogin.execute(GUEST_ID, '123456'),
      ).resolves.toMatchObject({ guest: { id: GUEST_ID } });

      await expect(
        verifyLogin.execute(OTHER_GUEST_ID, '123456'),
      ).resolves.toMatchObject({ guest: { id: OTHER_GUEST_ID } });
    });

    it('will not let one guest redeem another guest’s code', async () => {
      const { verifyLogin, redis } = build({
        guests: [buildGuest(), buildGuest(OTHER_GUEST_ID, 'sam@example.com')],
      });

      // Only Sam has a live code.
      await redis.service.set(loginKey(OTHER_GUEST_ID), '123456');

      await expect(verifyLogin.execute(GUEST_ID, '123456')).rejects.toThrow(
        BadRequestException,
      );
      // ...and Sam's entry is untouched by the failed attempt.
      expect(redis.strings.has(loginKey(OTHER_GUEST_ID))).toBe(true);
    });

    it('registration entries are per-guest too', async () => {
      const { register, verifyRegister, saved, emails } = build();

      const first = await register.execute({
        name: 'Dana',
        email: 'dana@example.com',
      });
      const firstCode = sentCode(emails);

      emails.length = 0;
      const second = await register.execute({
        name: 'Sam',
        email: 'sam@example.com',
      });

      // Both pending registrations survive; neither overwrote the other.
      await verifyRegister.execute(second.guest.id, sentCode(emails));
      await verifyRegister.execute(first.guest.id, firstCode);

      expect(saved.map((g) => g.name).sort()).toEqual(['Dana', 'Sam']);
    });
  });
});
