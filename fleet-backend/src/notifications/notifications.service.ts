import { Injectable, NotFoundException } from "@nestjs/common";
import { resolvePageLimit, wantsFullList } from "../common/database/list-query.helper";
import { queryPaginated } from "../common/database/pagination.helper";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly db: TenantDatabaseService) {}

  async findAll(
    query: ListQueryDto,
    audience?: string,
    unreadOnly?: boolean,
  ) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (audience) {
      clauses.push(`audience = $${i++}`);
      params.push(audience);
    }
    if (unreadOnly) {
      clauses.push(`read = FALSE`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    if (wantsFullList(query)) {
      return this.db.queryAll(
        `SELECT * FROM workflow_notifications ${where} ORDER BY created_at DESC`,
        params,
      );
    }

    const { page, limit } = resolvePageLimit(query);
    return queryPaginated(this.db, {
      table: "workflow_notifications",
      where,
      params,
      page,
      limit,
      orderBy: "created_at DESC",
    }) as Promise<PaginatedResult<Record<string, unknown>>>;
  }

  async markRead(id: string) {
    const row = await this.db.queryOne(
      `UPDATE workflow_notifications SET read = TRUE WHERE id = $1 RETURNING *`,
      [id],
    );
    if (!row) throw new NotFoundException("Notification not found");
    return row;
  }

  async markAllRead(audience: string) {
    await this.db.query(
      `UPDATE workflow_notifications SET read = TRUE WHERE audience = $1 AND read = FALSE`,
      [audience],
    );
    return { ok: true };
  }
}
