import { ForbiddenException } from '@nestjs/common';
import { Roles } from 'src/shared/value-objects/role.vo';
import { buildContext, RequestUser } from '../__fixtures__/execution-context';
import { AdminGuard } from './admin.guard';

const admits = (user: RequestUser | null): boolean => {
  const { context } = buildContext({ user });

  try {
    return new AdminGuard().canActivate(context);
  } catch (error) {
    if (error instanceof ForbiddenException) return false;
    throw error;
  }
};

describe('AdminGuard', () => {
  it('admits an admin', () => {
    expect(admits({ role: Roles.ADMIN })).toBe(true);
  });

  it.each([Roles.SUPERVISOR, Roles.EMPLOYEE, Roles.DRIVER, Roles.GUEST])(
    'refuses a %s',
    (role) => {
      expect(admits({ role })).toBe(false);
    },
  );

  it('refuses a request with no user', () => {
    expect(admits(null)).toBe(false);
  });

  it('refuses a user with no role', () => {
    expect(admits({})).toBe(false);
  });

  /**
   * The comparison is against the string, and `JwtStrategy` puts `user.role.toString()`
   * on the request — so this works only because both sides are plain strings. Handing it
   * the `Role` value object instead would fail silently, the same identity trap that
   * broke `AccessControlService`.
   */
  it('compares a plain string, not a Role value object', () => {
    expect(admits({ role: 'ADMIN' })).toBe(true);
    expect(admits({ role: 'admin' })).toBe(false);
  });

  /**
   * Unlike the permission guards, this one reads no metadata and has no fail-open path:
   * applying it always enforces something. It is the only guard in the module that
   * cannot be accidentally disarmed.
   */
  it('takes no metadata, so it cannot be silently disabled', () => {
    const { context } = buildContext({
      user: { role: Roles.EMPLOYEE },
      metadata: { admin: [], permissions: [] },
    });

    expect(() => new AdminGuard().canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
