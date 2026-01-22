import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as relations from './relations';
import { Injectable } from '@nestjs/common';

const fullSchema = { ...schema, ...relations };

@Injectable()
export class DrizzleService {
  private pgClient: Pool;
  private drizzleClient: NodePgDatabase<typeof fullSchema>;

  constructor(private readonly config: ConfigService) {
    this.pgClient = new Pool({
      connectionString: this.config.get('DATABASE_URL'),
    });
    this.drizzleClient = drizzle({
      client: this.pgClient,
      schema: fullSchema,
    });
  }

  getPgClient(): Pool {
    return this.pgClient;
  }

  get client(): NodePgDatabase<typeof fullSchema> {
    return this.drizzleClient;
  }
}