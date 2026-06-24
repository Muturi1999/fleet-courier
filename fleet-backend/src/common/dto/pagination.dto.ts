import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: "Free-text search" })
  @IsOptional()
  @IsString()
  search?: string;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  mode?: "offset" | "keyset";
  hasMore?: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
};

export type KeysetMeta = PaginatedMeta & {
  mode: "keyset";
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginatedMeta;
};

export function paginateOffset(page: number, limit: number): { offset: number; limit: number } {
  const p = Math.max(1, page);
  const l = Math.min(100, Math.max(1, limit));
  return { offset: (p - 1) * l, limit: l };
}
