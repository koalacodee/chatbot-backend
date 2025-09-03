import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClient;

  constructor(private readonly config: ConfigService) {
    const host = config.getOrThrow<string>('REDIS_HOST', '127.0.0.1');
    const port = config.getOrThrow<number>('REDIS_PORT', 6379);
    const password = config.get<string>('REDIS_PASSWORD');
    const username = config.get('REDIS_USER', 'default');
    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      username,
      family: parseInt(config.get('REDIS_IP_FAMILY', '4')),
    });
    this.client.on('connect', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    expireSeconds?: number,
  ): Promise<'OK' | null> {
    if (expireSeconds) {
      return this.client.set(key, value, 'EX', expireSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async execCommand(command: string, ...args: any[]): Promise<any> {
    // Generic method for advanced use
    // Example: await redisService.execCommand('hgetall', 'myhash')
    // @ts-ignore
    return this.client[command](...args);
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }
}
