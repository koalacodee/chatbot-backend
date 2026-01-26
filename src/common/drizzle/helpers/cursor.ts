// cursor-pagination.helper.ts

import { SQL, sql, desc, asc } from 'drizzle-orm';
import { encodeCursor, decodeCursor } from './cursor-encoders';
// cursor-pagination.types.ts

export interface CursorInput {
  cursor?: string;
  direction?: 'next' | 'prev';
  pageSize?: number;
}

export interface CursorMeta {
  nextCursor?: string;
  prevCursor?: string;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: CursorMeta;
}

// The shape of cursor data - typically includes a sortable field + unique ID
export interface CursorData {
  [key: string]: any;
}
export interface CursorPaginationConfig<TTable, TCursorData extends CursorData> {
  /** The table being queried */
  table: TTable;

  /** Fields that make up the cursor (in order of sort priority) */
  cursorFields: {
    column: any; // The Drizzle column reference
    key: keyof TCursorData; // The key in the cursor data object
  }[];

  /** Default page size if not specified */
  defaultPageSize?: number;

  /** Sort direction - defaults to 'desc' */
  sortDirection?: 'asc' | 'desc';
}

export class CursorPagination<TCursorData extends CursorData> {
  private readonly defaultPageSize: number;
  private readonly sortDirection: 'asc' | 'desc';
  private readonly cursorFields: { column: any; key: keyof TCursorData }[];

  constructor(config: CursorPaginationConfig<any, TCursorData>) {
    this.cursorFields = config.cursorFields;
    this.defaultPageSize = config.defaultPageSize ?? 10;
    this.sortDirection = config.sortDirection ?? 'desc';
  }

  /**
   * Parse cursor input and return pagination params
   */
  parseInput(input?: CursorInput) {
    const pageSize = input?.pageSize ?? this.defaultPageSize;
    const direction = input?.direction ?? 'next';
    const cursor = input?.cursor;
    const cursorData = cursor ? decodeCursor<TCursorData>(cursor) : null;

    return {
      pageSize,
      direction,
      cursor,
      cursorData,
      limit: pageSize + 1, // Fetch one extra to detect hasMore
    };
  }

  /**
   * Build the cursor WHERE condition for SQL
   */
  buildCursorCondition(
    cursorData: TCursorData | null,
    direction: 'next' | 'prev',
  ): SQL | undefined {
    if (!cursorData) return undefined;

    // Build tuple comparison: (col1, col2) < (val1, val2)
    const columns = this.cursorFields.map(f => f.column);
    const values = this.cursorFields.map(f => cursorData[f.key]);

    // Determine comparison operator based on sort and navigation direction
    // For DESC sort: next = <, prev = >
    // For ASC sort: next = >, prev = <
    const isDescending = this.sortDirection === 'desc';
    const useGreaterThan = isDescending ? direction === 'prev' : direction === 'next';

    // Build the tuple comparison SQL
    const columnTuple = sql.join(columns, sql`, `);
    const valueTuple = sql.join(
      values.map(v => sql`${v}`),
      sql`, `,
    );

    return sql`(${columnTuple}) ${useGreaterThan ? sql`>` : sql`<`} (${valueTuple})`;
  }

  /**
   * Get the ORDER BY clauses
   */
  getOrderBy() {
    const orderFn = this.sortDirection === 'desc' ? desc : asc;
    return this.cursorFields.map(f => orderFn(f.column));
  }

  /**
   * Process results and build pagination meta
   */
  processResults<T extends Record<string, any>>(
    results: T[],
    params: {
      pageSize: number;
      direction: 'next' | 'prev';
      cursor?: string;
    },
    /** Function to extract cursor data from a result item */
    extractCursorData: (item: T) => TCursorData,
  ): { data: T[]; meta: CursorMeta } {
    const { pageSize, direction, cursor } = params;

    const hasMore = results.length > pageSize;
    const data = hasMore ? results.slice(0, pageSize) : results;

    // Determine page existence
    const hasNextPage = direction === 'next' ? hasMore : !!cursor;
    const hasPrevPage = direction === 'prev' ? hasMore : !!cursor;

    const firstItem = data[0];
    const lastItem = data[data.length - 1];

    return {
      data,
      meta: {
        nextCursor: hasNextPage && lastItem
          ? encodeCursor(extractCursorData(lastItem))
          : undefined,
        prevCursor: hasPrevPage && firstItem
          ? encodeCursor(extractCursorData(firstItem))
          : undefined,
        hasNextPage,
        hasPrevPage,
      },
    };
  }
}

/**
 * Factory function to create a cursor pagination instance
 */
export function createCursorPagination<TCursorData extends CursorData>(
  config: CursorPaginationConfig<any, TCursorData>,
) {
  return new CursorPagination<TCursorData>(config);
}