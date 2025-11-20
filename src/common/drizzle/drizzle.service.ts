import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DrizzleService {
  private pgClient: Pool;
  private drizzleClient: NodePgDatabase<typeof schema>;

  constructor(private readonly config: ConfigService) {
    this.pgClient = new Pool({
      connectionString: this.config.get('DATABASE_URL'),
    });
    this.drizzleClient = drizzle({
      client: this.pgClient,
      schema,
    });
  }

  getPgClient(): Pool {
    return this.pgClient;
  }

  get client(): NodePgDatabase<typeof schema> {
    return this.drizzleClient;
  }
}