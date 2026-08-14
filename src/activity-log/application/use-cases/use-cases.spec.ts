import { FakeActivityLogRepository } from '../../__fixtures__/fake-activity-log.repository';
import { FakeUserRepository } from '../../__fixtures__/fake-user.repository';
import { AggregateActivityFeedUseCase } from './aggregate-activity-feed.use-case';
import { CalculateAgentPerformanceUseCase } from './calculate-agent-performance.use-case';
import { GetAnalyticsOverviewUseCase } from './get-analytics-overview.use-case';
import { GetRecentActivityUseCase } from './get-recent-activity.use-case';
import { PerformanceSummaryUseCase } from './performance-summary.use-case';
import { SearchUsersUseCase } from './search-users.use-case';

/**
 * These use-cases are deliberately thin — every one is a single delegation. The value in
 * covering them is not branching logic, it is pinning the call contract: which argument
 * of the input DTO reaches which repository parameter. That is exactly the wiring that
 * breaks silently during a refactor, because passing the wrong field still typechecks
 * whenever both are strings.
 */
describe('activity-log use-cases', () => {
  let repository: FakeActivityLogRepository;

  beforeEach(() => {
    repository = new FakeActivityLogRepository();
  });

  describe('AggregateActivityFeedUseCase', () => {
    it('forwards the whole input through to the repository', async () => {
      const useCase = new AggregateActivityFeedUseCase(repository);
      const input = {
        userId: 'user-1',
        limit: 25,
        page: 2,
        supervisorId: 'supervisor-1',
      };

      await useCase.execute(input);

      expect(repository.received.aggregatedFeed).toEqual(input);
    });

    it('returns the repository result unchanged', async () => {
      const useCase = new AggregateActivityFeedUseCase(repository);
      repository.aggregatedFeed = {
        data: [{ type: 'ticket_answered', activities: [] }],
        nextCursor: '2026-01-01T00:00:00.000Z',
      };

      await expect(useCase.execute({})).resolves.toBe(
        repository.aggregatedFeed,
      );
    });
  });

  describe('CalculateAgentPerformanceUseCase', () => {
    it('forwards the performance args', async () => {
      const useCase = new CalculateAgentPerformanceUseCase(repository);
      const input = { limit: 20, cursor: 'abc', supervisorId: 'supervisor-1' };

      await useCase.execute(input);

      expect(repository.received.agentPerformance).toEqual(input);
    });

    it('returns the repository result unchanged', async () => {
      const useCase = new CalculateAgentPerformanceUseCase(repository);
      repository.agentPerformance = {
        users: [{ id: 'u1', name: 'Dana', role: 'employee' }],
        tickets: [],
      };

      await expect(useCase.execute({})).resolves.toBe(
        repository.agentPerformance,
      );
    });
  });

  describe('GetAnalyticsOverviewUseCase', () => {
    it('unwraps supervisorId out of the input object', async () => {
      const useCase = new GetAnalyticsOverviewUseCase(repository);

      await useCase.execute({ supervisorId: 'supervisor-1' });

      expect(repository.received.analyticsOverview).toBe('supervisor-1');
    });

    it('passes undefined when no supervisor is given', async () => {
      const useCase = new GetAnalyticsOverviewUseCase(repository);

      await useCase.execute({});

      expect(repository.received.analyticsOverview).toBeUndefined();
    });

    // The use-case guards with `input?.supervisorId`, so a missing input is legal.
    it('tolerates a missing input object', async () => {
      const useCase = new GetAnalyticsOverviewUseCase(repository);

      await expect(useCase.execute(undefined as any)).resolves.toBeNull();
      expect(repository.received.analyticsOverview).toBeUndefined();
    });
  });

  describe('GetRecentActivityUseCase', () => {
    it('defaults the limit to 10', async () => {
      const useCase = new GetRecentActivityUseCase(repository);

      await useCase.execute();

      expect(repository.received.recentActivity).toBe(10);
    });

    it('passes an explicit limit through', async () => {
      const useCase = new GetRecentActivityUseCase(repository);

      await useCase.execute(3);

      expect(repository.received.recentActivity).toBe(3);
    });

    it('wraps the repository rows in an items envelope', async () => {
      const useCase = new GetRecentActivityUseCase(repository);
      repository.recentActivity = [
        {
          id: 'log-1',
          type: 'ticket',
          description: 'Ticket #42 answered',
          timestamp: '2026-01-01T00:00:00.000Z',
          meta: {},
        },
      ];

      await expect(useCase.execute()).resolves.toEqual({
        items: repository.recentActivity,
      });
    });

    it('returns an empty envelope rather than null when there is nothing', async () => {
      const useCase = new GetRecentActivityUseCase(repository);

      await expect(useCase.execute()).resolves.toEqual({ items: [] });
    });
  });

  describe('PerformanceSummaryUseCase', () => {
    it('unwraps userId out of the input object', async () => {
      const useCase = new PerformanceSummaryUseCase(repository);

      await useCase.execute({ userId: 'user-1' });

      expect(repository.received.performanceSummary).toBe('user-1');
    });

    it('passes undefined when no user is given, which the repository reads as "everyone"', async () => {
      const useCase = new PerformanceSummaryUseCase(repository);

      await useCase.execute({});

      expect(repository.received.performanceSummary).toBeUndefined();
    });

    it('returns the summary unchanged', async () => {
      const useCase = new PerformanceSummaryUseCase(repository);
      repository.performanceSummary = {
        ticketsAnswered: 12,
        avgResponseTime: 4500,
        tasksPerformed: 7,
        avgTaskTime: 90000,
        tasksApproved: 5,
        satisfiedTickets: 9,
        dissatisfiedTickets: 3,
      };

      await expect(useCase.execute({})).resolves.toBe(
        repository.performanceSummary,
      );
    });
  });

  describe('SearchUsersUseCase', () => {
    it('forwards the search query verbatim', async () => {
      const users = new FakeUserRepository();
      const useCase = new SearchUsersUseCase(users);

      await useCase.execute({ searchQuery: '  Dana ' });

      // No trimming or normalisation happens here — that is the repository's business.
      expect(users.searched).toEqual(['  Dana ']);
    });

    it('returns whatever the user repository matched', async () => {
      const users = new FakeUserRepository();
      const useCase = new SearchUsersUseCase(users);

      await expect(useCase.execute({ searchQuery: 'dana' })).resolves.toBe(
        users.users,
      );
    });
  });
});
