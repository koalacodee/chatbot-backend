import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PROMOTION_PAGE_SIZE = 50;
export const MAX_PROMOTION_PAGE_SIZE = 200;

export class ListPromotionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  /**
   * Defaulted rather than optional: the previous behaviour was an unbounded scan of
   * every promotion, so an absent `limit` has to mean a page, not everything.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PROMOTION_PAGE_SIZE)
  limit?: number = DEFAULT_PROMOTION_PAGE_SIZE;
}
