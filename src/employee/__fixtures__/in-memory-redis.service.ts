import { stubRepository } from 'src/common/__fixtures__/stub-repository';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';

export interface InMemoryRedis {
  service: RedisService;
  strings: Map<string, string>;
  sets: Map<string, Set<string>>;
  /** TTL in seconds recorded against each key on its last write. */
  ttls: Map<string, number | undefined>;
  /** Commands routed through execCommand, for asserting index bookkeeping. */
  commands: Array<{ command: string; args: unknown[] }>;
}

/**
 * An in-memory stand-in for the four Redis operations this module uses: string get/set
 * with an optional TTL, del, and the set commands routed through `execCommand`.
 *
 * Built through `stubRepository` rather than by subclassing `RedisService`, because that
 * constructor reads config and opens a real connection — there is no way to inherit from
 * it without connecting. The methods supplied here still have their signatures checked
 * against the real class.
 *
 * TTLs are recorded but never enforced; nothing expires on a timer. That matches the
 * invitation service, which decides expiry from the `expiresAt` field inside the stored
 * payload and treats the Redis TTL only as a backstop.
 */
export function createInMemoryRedis(): InMemoryRedis {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const ttls = new Map<string, number | undefined>();
  const commands: Array<{ command: string; args: unknown[] }> = [];

  const service = stubRepository<RedisService>('RedisService', {
    get: async (key: string) => strings.get(key) ?? null,

    set: async (key: string, value: string, expireSeconds?: number) => {
      strings.set(key, value);
      ttls.set(key, expireSeconds);
      return 'OK' as const;
    },

    del: async (key: string) => {
      const existed = strings.delete(key);
      ttls.delete(key);
      return existed ? 1 : 0;
    },

    execCommand: async (command: string, ...args: any[]) => {
      commands.push({ command, args });

      const [key, ...rest] = args as string[];

      switch (command) {
        case 'sadd': {
          const set = sets.get(key) ?? new Set<string>();
          for (const member of rest) set.add(member);
          sets.set(key, set);
          return rest.length;
        }
        case 'srem': {
          const set = sets.get(key);
          if (!set) return 0;
          let removed = 0;
          for (const member of rest) removed += set.delete(member) ? 1 : 0;
          return removed;
        }
        case 'smembers':
          return [...(sets.get(key) ?? [])];
        default:
          throw new Error(`in-memory redis does not implement '${command}'`);
      }
    },
  });

  return { service, strings, sets, ttls, commands };
}
