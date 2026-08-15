import { FakeDriverRepository } from '../../__fixtures__/fake-driver.repository';
import { Driver } from '../../domain/entities/driver.entity';
import { CreateDriverUseCase } from './create-driver.use-case';
import { DeleteDriverUseCase } from './delete-driver.use-case';
import { GetAllDriversUseCase } from './get-all-drivers.use-case';
import { GetDriverByUserIdUseCase } from './get-driver-by-user-id.use-case';
import { GetDriverUseCase } from './get-driver.use-case';
import { UpdateDriverUseCase } from './update-driver.use-case';

const DRIVER_ID = '018f4a1e-1c7a-7000-8000-000000000801';
const USER_ID = '018f4a1e-1c7a-7000-8000-000000000802';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000803';
const MISSING_ID = '018f4a1e-1c7a-7000-8000-0000000008ff';

const buildDriver = (overrides = {}) =>
  Driver.create({
    id: DRIVER_ID,
    userId: USER_ID,
    supervisorId: SUPERVISOR_ID,
    licensingNumber: 'LIC-1234',
    drivingLicenseExpiry: new Date('2027-06-30T00:00:00.000Z'),
    ...overrides,
  });

describe('driver CRUD use-cases', () => {
  let drivers: FakeDriverRepository;

  beforeEach(() => {
    drivers = new FakeDriverRepository();
  });

  describe('CreateDriverUseCase', () => {
    const request = {
      userId: USER_ID,
      supervisorId: SUPERVISOR_ID,
      licensingNumber: 'LIC-1234',
      drivingLicenseExpiry: new Date('2027-06-30T00:00:00.000Z'),
    };

    it('persists a driver built from the request', async () => {
      const useCase = new CreateDriverUseCase(drivers);

      const driver = await useCase.execute(request);

      expect(drivers.saved).toEqual([driver]);
      expect(driver.licensingNumber).toBe('LIC-1234');
    });

    it('assigns a fresh id', async () => {
      const useCase = new CreateDriverUseCase(drivers);

      const driver = await useCase.execute(request);

      expect(driver.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    /**
     * `vehicles` and `violations` are accepted by the request type and then never read —
     * the entity is built from the four scalar fields only. Callers passing them get no
     * error and no effect.
     */
    it('ignores the vehicles and violations it accepts', async () => {
      const useCase = new CreateDriverUseCase(drivers);

      const driver = await useCase.execute({
        ...request,
        vehicles: ['vehicle-1'],
        violations: ['violation-1'],
      });

      expect(driver.vehicles).toBeUndefined();
      expect(driver.violations).toBeUndefined();
    });
  });

  describe('UpdateDriverUseCase', () => {
    it('returns null for an unknown driver', async () => {
      const useCase = new UpdateDriverUseCase(drivers);

      await expect(useCase.execute({ id: MISSING_ID })).resolves.toBeNull();
      expect(drivers.updated).toHaveLength(0);
    });

    it('writes a driver carrying the same field values', async () => {
      drivers.seed(buildDriver());
      const useCase = new UpdateDriverUseCase(drivers);

      const updated = await useCase.execute({ id: DRIVER_ID });

      expect(drivers.updated).toHaveLength(1);
      expect(updated?.toJSON()).toEqual(buildDriver().toJSON());
    });

    /**
     * This use-case is a no-op. It accepts `vehicles` and `violations`, then rebuilds the
     * driver from the values already loaded — the request fields are never read. So the
     * only thing it can ever write is what was already stored, and the endpoint behind it
     * cannot change a driver's vehicles or violations.
     *
     * Worth reading alongside the repository note: `update` there only ever *attaches*
     * children, because the FKs are NOT NULL and detaching is impossible anyway.
     */
    it('discards the vehicles and violations it was asked to set', async () => {
      drivers.seed(buildDriver());
      const useCase = new UpdateDriverUseCase(drivers);

      const updated = await useCase.execute({
        id: DRIVER_ID,
        vehicles: ['vehicle-1'],
        violations: ['violation-1'],
      });

      expect(updated?.vehicles).toBeUndefined();
      expect(updated?.violations).toBeUndefined();
    });

    it('preserves the identity of the driver it rebuilt', async () => {
      drivers.seed(buildDriver());
      const useCase = new UpdateDriverUseCase(drivers);

      const updated = await useCase.execute({ id: DRIVER_ID });

      expect(updated?.id.value).toBe(DRIVER_ID);
      expect(updated?.userId.value).toBe(USER_ID);
      expect(updated?.supervisorId.value).toBe(SUPERVISOR_ID);
    });
  });

  describe('DeleteDriverUseCase', () => {
    it('reports false and deletes nothing for an unknown driver', async () => {
      const useCase = new DeleteDriverUseCase(drivers);

      await expect(useCase.execute(MISSING_ID)).resolves.toBe(false);
      expect(drivers.deleted).toEqual([]);
    });

    it('deletes an existing driver and reports true', async () => {
      drivers.seed(buildDriver());
      const useCase = new DeleteDriverUseCase(drivers);

      await expect(useCase.execute(DRIVER_ID)).resolves.toBe(true);
      expect(drivers.deleted).toEqual([DRIVER_ID]);
      await expect(drivers.findById(DRIVER_ID)).resolves.toBeNull();
    });
  });

  describe('read use-cases', () => {
    it('GetDriverUseCase returns the driver', async () => {
      drivers.seed(buildDriver());

      await expect(
        new GetDriverUseCase(drivers).execute(DRIVER_ID),
      ).resolves.toMatchObject({ licensingNumber: 'LIC-1234' });
    });

    it('GetDriverUseCase returns null when absent', async () => {
      await expect(
        new GetDriverUseCase(drivers).execute(MISSING_ID),
      ).resolves.toBeNull();
    });

    it('GetDriverByUserIdUseCase looks up by user, not driver id', async () => {
      drivers.seed(buildDriver());

      await expect(
        new GetDriverByUserIdUseCase(drivers).execute(USER_ID),
      ).resolves.toMatchObject({ licensingNumber: 'LIC-1234' });
      await expect(
        new GetDriverByUserIdUseCase(drivers).execute(DRIVER_ID),
      ).resolves.toBeNull();
    });

    it('GetAllDriversUseCase returns everything', async () => {
      drivers.seed(
        buildDriver(),
        buildDriver({ id: MISSING_ID, licensingNumber: 'LIC-5678' }),
      );

      await expect(
        new GetAllDriversUseCase(drivers).execute(),
      ).resolves.toHaveLength(2);
    });

    it('GetAllDriversUseCase returns an empty list, not null', async () => {
      await expect(new GetAllDriversUseCase(drivers).execute()).resolves.toEqual(
        [],
      );
    });
  });
});
