import { ConfigService } from '@nestjs/config';
import {
  drizzle,
  NodePgDatabase,
  NodePgQueryResultHKT,
} from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as relations from './relations';
import { Injectable } from '@nestjs/common';
import {
  ExtractTablesWithRelations,
  getTableColumns,
  SQL,
  sql,
} from 'drizzle-orm';
import { PgTable, PgTransaction } from 'drizzle-orm/pg-core';

const fullSchema = { ...schema, ...relations };

export function getDatabaseInstance(connectionString: string) {
  const pgClient = new Pool({
    connectionString: connectionString,
  });
  return drizzle({
    client: pgClient,
    schema: fullSchema,
    logger: true,
  });
}

@Injectable()
export class DrizzleService {
  private pgClient: Pool;
  private drizzleClient: DatabaseInstance;

  constructor(private readonly config: ConfigService) {
    const databaseUrl = this.config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in the configuration');
    }
    this.drizzleClient = getDatabaseInstance(databaseUrl);
  }

  getPgClient(): Pool {
    return this.pgClient;
  }

  get client(): DatabaseInstance {
    return this.drizzleClient;
  }
}

export type DrizzleTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof fullSchema,
  ExtractTablesWithRelations<typeof fullSchema>
>;

const NOT_UPDATABLE_COLUMNS = new Set([
  'id',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
]);

// Helper function to build conflict update columns (Drizzle 1.0+)
export function buildConflictUpdateColumns<
  T extends PgTable,
  Q extends keyof T['_']['columns'],
>(table: T, columns?: Q[]) {
  const cls = getTableColumns(table);
  columns ||= Object.keys(cls).filter(
    (key) => !NOT_UPDATABLE_COLUMNS.has(key),
  ) as Q[];
  return columns.reduce(
    (acc, column) => {
      const colName = cls[column].name;
      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>,
  );
}

export type DatabaseInstance = NodePgDatabase<typeof fullSchema>;
