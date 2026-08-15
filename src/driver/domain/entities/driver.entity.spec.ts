import { BadRequestException } from '@nestjs/common';
import { Driver } from './driver.entity';

const DRIVER_ID = '018f4a1e-1c7a-7000-8000-000000000601';
const USER_ID = '018f4a1e-1c7a-7000-8000-000000000602';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000603';

const EXPIRY = new Date('2027-06-30T00:00:00.000Z');

const build = (overrides = {}) =>
  Driver.create({
    id: DRIVER_ID,
    userId: USER_ID,
    supervisorId: SUPERVISOR_ID,
    licensingNumber: 'LIC-1234',
    drivingLicenseExpiry: EXPIRY,
    ...overrides,
  });

describe('Driver', () => {
  describe('identity', () => {
    it('wraps all three ids as UUID value objects', () => {
      const driver = build();

      expect(driver.id.value).toBe(DRIVER_ID);
      expect(driver.userId.value).toBe(USER_ID);
      expect(driver.supervisorId.value).toBe(SUPERVISOR_ID);
    });

    it('generates an id when none is supplied', () => {
      const driver = build({ id: undefined });

      expect(driver.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it.each([
      ['id', { id: 'nope' }],
      ['userId', { userId: 'nope' }],
      ['supervisorId', { supervisorId: 'nope' }],
    ])('rejects a malformed %s', (_label, overrides) => {
      expect(() => build(overrides)).toThrow(BadRequestException);
    });
  });

  describe('licence', () => {
    it('stores the licensing number verbatim', () => {
      expect(build().licensingNumber).toBe('LIC-1234');
    });

    it('keeps the expiry as a Date', () => {
      expect(build().drivingLicenseExpiry).toEqual(EXPIRY);
    });

    /**
     * There is no expiry validation on the entity — an already-expired licence
     * constructs happily. Whatever enforces that lives outside the domain model.
     */
    it('accepts an expiry in the past', () => {
      const expired = new Date('2000-01-01T00:00:00.000Z');

      expect(build({ drivingLicenseExpiry: expired }).drivingLicenseExpiry).toEqual(
        expired,
      );
    });
  });

  describe('optional relations', () => {
    it('leaves user, vehicles and violations undefined when not supplied', () => {
      const driver = build();

      expect(driver.user).toBeUndefined();
      expect(driver.vehicles).toBeUndefined();
      expect(driver.violations).toBeUndefined();
    });

    /**
     * Unlike Department, these arrays are not defensively copied — the getter hands back
     * the same instance the constructor was given, so a caller can mutate a driver's
     * vehicle list from outside.
     */
    it('exposes the very array it was constructed with', () => {
      const vehicles: any[] = [];
      const driver = build({ vehicles });

      vehicles.push({ smuggled: true });

      expect(driver.vehicles).toHaveLength(1);
    });

    it('distinguishes an empty list from an absent one', () => {
      expect(build({ vehicles: [] }).vehicles).toEqual([]);
      expect(build().vehicles).toBeUndefined();
    });
  });

  describe('mutation', () => {
    it('allows the licence to be replaced', () => {
      const driver = build();

      driver.licensingNumber = 'LIC-9999';

      expect(driver.licensingNumber).toBe('LIC-9999');
    });

    it('allows the supervisor to be reassigned', () => {
      const driver = build();
      const other = build({ supervisorId: USER_ID });

      driver.supervisorId = other.supervisorId;

      expect(driver.supervisorId.value).toBe(USER_ID);
    });
  });

  describe('toJSON', () => {
    it('emits ids as strings and keeps the expiry as a Date', () => {
      const json = build().toJSON();

      expect(json.id).toBe(DRIVER_ID);
      expect(json.userId).toBe(USER_ID);
      expect(json.supervisorId).toBe(SUPERVISOR_ID);
      // Unlike most entities here, this one does not stringify its date.
      expect(json.drivingLicenseExpiry).toEqual(EXPIRY);
    });

    it('passes relations straight through rather than serialising them', () => {
      const vehicles: any[] = [{ not: 'an entity' }];
      const json = build({ vehicles }).toJSON();

      expect(json.vehicles).toBe(vehicles);
    });

    it('does not throw when relations are absent', () => {
      expect(() => build().toJSON()).not.toThrow();
    });
  });
});
