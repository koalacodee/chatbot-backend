import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { User } from 'src/shared/entities/user.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Email } from 'src/shared/value-objects/email.vo';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { FakeEmployeeRequestRepository } from '../../__fixtures__/fake-employee-request.repository';
import {
  EmployeeRequest,
  RequestStatus,
} from '../../domain/entities/employee-request.entity';
import { StaffRequestResolvedEvent } from '../../domain/events/staff-request-resolved.event';
import { ApproveEmployeeRequestUseCase } from './approve-employee-request.use-case';
import { RejectEmployeeRequestUseCase } from './reject-employee-request.use-case';

const REQUEST_ID = '018f4a1e-1c7a-7000-8000-000000000b01';
const ADMIN_USER_ID = '018f4a1e-1c7a-7000-8000-000000000b02';
const ADMIN_ID = '018f4a1e-1c7a-7000-8000-000000000b03';
const SUPERVISOR_ID = '018f4a1e-1c7a-7000-8000-000000000b04';
const SUPERVISOR_USER_ID = '018f4a1e-1c7a-7000-8000-000000000b05';

const buildSupervisor = () =>
  Supervisor.create({
    id: SUPERVISOR_ID,
    userId: SUPERVISOR_USER_ID,
    permissions: [],
    departments: [],
  });

const buildRequest = (overrides = {}) =>
  EmployeeRequest.create({
    id: REQUEST_ID,
    requestedBySupervisor: buildSupervisor(),
    requestedBySupervisorId: SUPERVISOR_ID,
    newEmployeeEmail: Email.create('hire@example.com'),
    newEmployeeFullName: 'New Hire',
    newEmployeeUsername: 'newhire',
    newEmployeeJobTitle: 'Agent',
    temporaryPassword: 'temp-secret',
    status: RequestStatus.PENDING,
    ...overrides,
  });

/** Captures every event emitted, using a real emitter rather than a spy. */
function recordEvents(emitter: EventEmitter2) {
  const events: Array<{ name: string; payload: any }> = [];
  emitter.onAny((name, payload) =>
    events.push({ name: String(name), payload }),
  );
  return events;
}

interface Options {
  adminFound?: boolean;
  emailTaken?: boolean;
  usernameTaken?: boolean;
}

function build(options: Options = {}) {
  const requests = new FakeEmployeeRequestRepository();
  const emitter = new EventEmitter2();
  const events = recordEvents(emitter);

  const takenUser = () =>
    User.create(
      {
        id: '018f4a1e-1c7a-7000-8000-000000000bff',
        name: 'Taken',
        email: 'taken@example.com',
        username: 'taken',
        password: 'already-a-hash',
        role: Roles.EMPLOYEE,
      },
      false,
    );

  // `save` is deliberately not stubbed: the user write now happens inside the
  // transactional approval, so reaching UserRepository.save would be a regression and the
  // stub throws with the method name.
  const users = stubRepository<UserRepository>('UserRepository', {
    findByEmail: async () => (options.emailTaken ? await takenUser() : null),
    findByUsername: async () =>
      options.usernameTaken ? await takenUser() : null,
  });

  const admins = stubRepository<AdminRepository>('AdminRepository', {
    findByUserId: async () =>
      options.adminFound === false
        ? null
        : Admin.create({ id: ADMIN_ID, userId: ADMIN_USER_ID }),
  });

  return {
    requests,
    events,
    approve: new ApproveEmployeeRequestUseCase(
      requests,
      users,
      admins,
      emitter,
    ),
    reject: new RejectEmployeeRequestUseCase(requests, admins, emitter),
  };
}

describe('ApproveEmployeeRequestUseCase', () => {
  const dto = { employeeRequestId: REQUEST_ID, approvedAdminUserID: ADMIN_USER_ID };

  describe('preconditions', () => {
    it('rejects an unknown request', async () => {
      const { approve } = build();

      await expect(approve.execute(dto)).rejects.toThrow(NotFoundException);
    });

    it.each([
      [RequestStatus.APPROVED],
      [RequestStatus.REJECTED],
    ])('refuses a request already %s', async (status) => {
      const { approve, requests } = build();
      requests.seed(buildRequest({ status }));

      await expect(approve.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('refuses when the email is already registered', async () => {
      const { approve, requests } = build({ emailTaken: true });
      requests.seed(buildRequest());

      await expect(approve.execute(dto)).rejects.toMatchObject({
        response: { details: [{ field: 'newEmployeeEmail' }] },
      });
    });

    it('refuses when the username is already registered', async () => {
      const { approve, requests } = build({ usernameTaken: true });
      requests.seed(buildRequest());

      await expect(approve.execute(dto)).rejects.toMatchObject({
        response: { details: [{ field: 'newEmployeeUsername' }] },
      });
    });

    it('commits nothing when a precondition fails', async () => {
      const { approve, requests } = build({ emailTaken: true });
      requests.seed(buildRequest());

      await expect(approve.execute(dto)).rejects.toThrow();

      expect(requests.approvals).toHaveLength(0);
    });
  });

  describe('on approval', () => {
    it('commits exactly one transactional approval', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      await approve.execute(dto);

      expect(requests.approvals).toHaveLength(1);
      expect(requests.saved).toHaveLength(0);
    });

    it('creates an EMPLOYEE user from the request details', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      await approve.execute(dto);

      const { user } = requests.approvals[0];
      expect(user.role.getRole()).toBe(Roles.EMPLOYEE);
      expect(user.username).toBe('newhire');
      expect(user.email.toString()).toBe('hire@example.com');
    });

    /** The stored temporary password is plaintext, so it must be hashed on the way in. */
    it('hashes the temporary password', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      await approve.execute(dto);

      expect(JSON.stringify(requests.approvals[0].user)).not.toContain(
        'temp-secret',
      );
    });

    it('creates an employee linked to the new user and the requesting supervisor', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      await approve.execute(dto);

      const { user, employee } = requests.approvals[0];
      expect(employee.userId.value).toBe(user.id);
      expect(employee.supervisorId.value).toBe(SUPERVISOR_ID);
    });

    it('starts the employee with no permissions or departments', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      await approve.execute(dto);

      expect(requests.approvals[0].employee.permissions).toEqual([]);
      expect(requests.approvals[0].employee.subDepartments).toEqual([]);
    });

    it('marks the request approved and stamps the resolver', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      const { employeeRequest } = await approve.execute(dto);

      expect(employeeRequest.status).toBe(RequestStatus.APPROVED);
      expect(employeeRequest.resolvedByAdmin?.id.value).toBe(ADMIN_ID);
      expect(employeeRequest.resolvedAt).toBeInstanceOf(Date);
    });

    it('returns the entities the transaction committed', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());

      const result = await approve.execute(dto);

      expect(result.newUser).toBe(requests.approvals[0].user);
      expect(result.newEmployee).toBe(requests.approvals[0].employee);
      expect(result.employeeRequest).toBe(requests.approvals[0].request);
    });

    it('emits a resolved event carrying the supervisor\u2019s USER id', async () => {
      const { approve, requests, events } = build();
      requests.seed(buildRequest());

      await approve.execute(dto);

      const resolved = events.find(
        (e) => e.name === StaffRequestResolvedEvent.name,
      );
      expect(resolved?.payload).toMatchObject({
        requestId: REQUEST_ID,
        newEmployeeUsername: 'newhire',
        requestedBySupervisorId: SUPERVISOR_USER_ID,
        status: 'approved',
      });
    });
  });

  describe('atomicity and admin validation', () => {
    it('refuses when the admin cannot be resolved', async () => {
      const { approve, requests } = build({ adminFound: false });
      requests.seed(buildRequest());

      await expect(approve.execute(dto)).rejects.toMatchObject({
        response: { details: [{ field: 'approvedAdminUserID' }] },
      });
    });

    /** The admin is resolved only after the request itself is validated. */
    it('reports the request problem, not the admin, when both are wrong', async () => {
      const { approve } = build({ adminFound: false });

      await expect(approve.execute(dto)).rejects.toMatchObject({
        response: { details: [{ field: 'employeeRequestId' }] },
      });
    });

    /**
     * The three writes are one transaction now, so a failure commits none of them —
     * previously the user landed first and was left orphaned, holding the email and
     * username that the retry would then reject.
     */
    it('commits nothing when the transaction fails', async () => {
      const { approve, requests } = build();
      requests.seed(buildRequest());
      requests.failApprovalWith(new Error('constraint violation'));

      await expect(approve.execute(dto)).rejects.toThrow(
        'constraint violation',
      );

      expect(requests.approvals).toHaveLength(0);
      expect(requests.saved).toHaveLength(0);
    });

    it('emits no resolved event when the transaction fails', async () => {
      const { approve, requests, events } = build();
      requests.seed(buildRequest());
      requests.failApprovalWith(new Error('constraint violation'));

      await expect(approve.execute(dto)).rejects.toThrow();

      expect(
        events.filter((e) => e.name === StaffRequestResolvedEvent.name),
      ).toHaveLength(0);
    });
  });
});

describe('RejectEmployeeRequestUseCase', () => {
  const dto = {
    employeeRequestId: REQUEST_ID,
    adminId: ADMIN_USER_ID,
    rejectionReason: 'Not this quarter',
  };

  it('rejects an unknown admin', async () => {
    const { reject, requests } = build({ adminFound: false });
    requests.seed(buildRequest());

    await expect(reject.execute(dto)).rejects.toMatchObject({
      response: { details: [{ field: 'adminId' }] },
    });
  });

  it('rejects an unknown request', async () => {
    const { reject } = build();

    await expect(reject.execute(dto)).rejects.toMatchObject({
      response: { details: [{ field: 'employeeRequestId' }] },
    });
  });

  it.each([[RequestStatus.APPROVED], [RequestStatus.REJECTED]])(
    'refuses a request already %s',
    async (status) => {
      const { reject, requests } = build();
      requests.seed(buildRequest({ status }));

      await expect(reject.execute(dto)).rejects.toThrow(BadRequestException);
    },
  );

  it('records the rejection, its reason and its resolver', async () => {
    const { reject, requests } = build();
    requests.seed(buildRequest());

    const result = await reject.execute(dto);

    expect(result.status).toBe(RequestStatus.REJECTED);
    expect(result.rejectionReason).toBe('Not this quarter');
    expect(result.resolvedByAdmin?.id.value).toBe(ADMIN_ID);
    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  /**
   * Regression guard for the notification bug: the listener feeds this field straight to
   * the recipient resolver, which documents it as "already a userId" and returns it
   * verbatim. Passing the supervisor ROW id here meant the recipient matched no user, and
   * the notification repository silently filters unknown recipients out — so rejections
   * were persisted with zero recipients and no supervisor was ever told.
   */
  it('emits the supervisor USER id, matching approve', async () => {
    const { reject, requests, events } = build();
    requests.seed(buildRequest());

    await reject.execute(dto);

    const resolved = events.find(
      (e) => e.name === StaffRequestResolvedEvent.name,
    );
    expect(resolved?.payload.requestedBySupervisorId).toBe(SUPERVISOR_USER_ID);
    expect(resolved?.payload.requestedBySupervisorId).not.toBe(SUPERVISOR_ID);
    expect(resolved?.payload.status).toBe('rejected');
  });
});
