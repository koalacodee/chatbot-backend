import { and, count, eq } from 'drizzle-orm';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { taskPresets } from '@/common/drizzle/schema';
import type { TaskPreset } from '@/v2/tasks/domain/entities/task-preset.entity';
import { rowToEntity } from './mappers';
import type {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import { createCursorPagination } from '@/common/drizzle/helpers/cursor';

export type TaskPresetCursorData = {
  createdAt: string;
  id: string;
};

const pagination = createCursorPagination<TaskPresetCursorData>({
  table: taskPresets,
  cursorFields: [
    { column: taskPresets.createdAt, key: 'createdAt' },
    { column: taskPresets.id, key: 'id' },
  ],
  defaultPageSize: 10,
  sortDirection: 'desc',
});

export async function findByAssignerId(
  db: DatabaseInstance | DrizzleTransaction,
  assignerId: string,
  cursor?: CursorInput,
): Promise<PaginatedArrayResult<TaskPreset> & { total: number }> {
  const paginationParams = pagination.parseInput(cursor);
  const cursorCondition = paginationParams.cursorData
    ? pagination.buildCursorCondition(
        paginationParams.cursorData,
        paginationParams.direction,
      )
    : undefined;

  const whereConditions = [eq(taskPresets.assignerId, assignerId)];
  const countWhere = [...whereConditions];

  if (cursorCondition) whereConditions.push(cursorCondition);

  const [rows, [countResult]] = await Promise.all([
    db
      .select()
      .from(taskPresets)
      .where(and(...whereConditions))
      .limit(paginationParams.limit)
      .orderBy(...pagination.getOrderBy()),
    db
      .select({ count: count(taskPresets.id) })
      .from(taskPresets)
      .where(and(...countWhere)),
  ]);

  const entities = rows.map(rowToEntity);
  const result = pagination.processResults(entities, paginationParams, (t) => ({
    createdAt: t.createdAt.toISOString(),
    id: t.id,
  }));

  return {
    ...result,
    total: countResult?.count ?? 0,
  };
}

export async function findByNameAndAssignerId(
  db: DatabaseInstance | DrizzleTransaction,
  name: string,
  assignerId: string,
): Promise<TaskPreset | null> {
  const [row] = await db
    .select()
    .from(taskPresets)
    .where(
      and(eq(taskPresets.name, name), eq(taskPresets.assignerId, assignerId)),
    )
    .limit(1);
  return row ? rowToEntity(row) : null;
}

export async function findAll(
  db: DatabaseInstance | DrizzleTransaction,
  offset?: number,
  limit?: number,
): Promise<TaskPreset[]> {
  let query = db.select().from(taskPresets);
  if (offset != null && offset > 0)
    query = query.offset(offset) as typeof query;
  if (limit != null && limit > 0) query = query.limit(limit) as typeof query;
  const rows = await query;
  return rows.map(rowToEntity);
}
