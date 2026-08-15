import { timingSafeEqual } from 'crypto';

/**
 * How long a guest's emailed six-digit code stays redeemable, for both the registration
 * and login flows. Matches the filehub pairing codes.
 *
 * Deliberately not declared in a `*.use-case.ts` file: `guest.module.ts` spreads
 * `Object.values(UseCases)` into its `providers`, so anything the use-case barrel
 * re-exports is treated as a provider — and a bare number is not one.
 */
export const GUEST_VERIFICATION_CODE_TTL_SECONDS = 25 * 60;

/**
 * Verification keys are scoped by guest, never by the code alone.
 *
 * Keying on `guest:{code}:login` meant two guests drawing the same six digits collided:
 * the second write silently replaced the first, and the first guest's code then
 * authenticated them as the second. Scoping by guest id makes each entry private to one
 * guest, so a repeated code is simply two unrelated keys.
 */
export const registrationKey = (guestId: string) => `guest:${guestId}:reg`;

export const loginKey = (guestId: string) => `guest:${guestId}:login`;

/**
 * Constant-time comparison of a submitted code against the stored one. The six-digit
 * space is small enough that brute force is the real threat rather than timing, but a
 * secret comparison should not leak its prefix either way.
 */
export function codesMatch(submitted: string, expected: string): boolean {
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);

  // timingSafeEqual throws on length mismatch, which would itself be a signal.
  return a.length === b.length && timingSafeEqual(a, b);
}
