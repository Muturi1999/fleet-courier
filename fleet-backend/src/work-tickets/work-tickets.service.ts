import { randomUUID } from "crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { queryPaginated } from "../common/database/pagination.helper";
import { PaginatedResult, PaginationQueryDto } from "../common/dto/pagination.dto";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreateWorkTicketDto, JourneyLegDto, UpdateWorkTicketDto } from "./dto/work-ticket.dto";

const WORK_TICKET_SERIES_START = 1189100;

type WorkTicketRow = Record<string, unknown> & {
  id: string;
  serial_no: string;
  plate: string;
  driver_name: string;
  route: string;
  trip_date: string;
  total: string | number;
  status: string;
  legs: JourneyLegDto[];
};

@Injectable()
export class WorkTicketsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    status?: string,
  ): Promise<PaginatedResult<WorkTicketRow> | WorkTicketRow[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (query.search?.trim()) {
      clauses.push(
        `(LOWER(serial_no) LIKE $${i} OR LOWER(plate) LIKE $${i} OR LOWER(driver_name) LIKE $${i} OR LOWER(route) LIKE $${i})`,
      );
      params.push(`%${query.search.toLowerCase()}%`);
      i++;
    }
    if (status) {
      clauses.push(`status = $${i++}`);
      params.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    if (query.page === undefined && query.limit === undefined) {
      return this.db.queryAll(`SELECT * FROM work_tickets ${where} ORDER BY created_at DESC`, params);
    }

    return queryPaginated<WorkTicketRow>(this.db, {
      table: "work_tickets",
      where,
      params,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    });
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM work_tickets WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Work ticket not found");
    return row;
  }

  async nextSerial(): Promise<string> {
    const row = await this.db.queryOne<{ max: string | null }>(
      `SELECT MAX(CAST(serial_no AS BIGINT))::text AS max FROM work_tickets`,
    );
    const max = parseInt(row?.max ?? String(WORK_TICKET_SERIES_START - 1), 10);
    return String(Math.max(max, WORK_TICKET_SERIES_START - 1) + 1);
  }

  private normalizeLegs(legs: JourneyLegDto[]) {
    return legs.map((leg) => ({
      id: leg.id ?? randomUUID(),
      details: leg.details ?? "",
      openingMileage: leg.openingMileage ?? 0,
      timeOut: leg.timeOut ?? "",
      officerAuthorising: leg.officerAuthorising ?? "",
      fuelDrawn: leg.fuelDrawn ?? "",
      timeIn: leg.timeIn ?? "",
      closingMileage: leg.closingMileage ?? 0,
      serviceType: leg.serviceType ?? "",
    }));
  }

  async create(dto: CreateWorkTicketDto) {
    const serialNo = dto.serialNo ?? (await this.nextSerial());
    const legs = this.normalizeLegs(dto.legs);
    return this.db.queryOne(
      `INSERT INTO work_tickets (
        serial_no, branch, trip_date, plate, make, driver_name, route,
        rate_type, agreed_rate, gate_pass_ref, header_notes, legs,
        private_km, official_km, net, vat, total, attachment_name, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        serialNo,
        dto.branch,
        dto.tripDate,
        dto.plate,
        dto.make,
        dto.driverName,
        dto.route,
        dto.rateType ?? "fixed",
        dto.agreedRate,
        dto.gatePassRef ?? null,
        dto.headerNotes ?? null,
        JSON.stringify(legs),
        dto.privateKm ?? 0,
        dto.officialKm ?? 0,
        dto.net,
        dto.vat,
        dto.total,
        dto.attachmentName ?? null,
        dto.status ?? "draft",
      ],
    );
  }

  async update(id: string, dto: UpdateWorkTicketDto) {
    const before = (await this.findOne(id)) as WorkTicketRow;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const map: Record<string, string> = {
      serialNo: "serial_no",
      branch: "branch",
      tripDate: "trip_date",
      plate: "plate",
      make: "make",
      driverName: "driver_name",
      route: "route",
      rateType: "rate_type",
      agreedRate: "agreed_rate",
      gatePassRef: "gate_pass_ref",
      headerNotes: "header_notes",
      privateKm: "private_km",
      officialKm: "official_km",
      net: "net",
      vat: "vat",
      total: "total",
      attachmentName: "attachment_name",
      status: "status",
      clientNote: "client_note",
    };

    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }

    if (dto.legs !== undefined) {
      fields.push(`legs = $${i++}`);
      values.push(JSON.stringify(this.normalizeLegs(dto.legs)));
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const updated = (await this.db.queryOne(
      `UPDATE work_tickets SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    )) as WorkTicketRow;

    await this.workflows.processWorkTicketStatusChange(before, updated);
    return updated;
  }

  async share(id: string) {
    const ticket = (await this.findOne(id)) as WorkTicketRow;
    if (ticket.status !== "draft") {
      throw new BadRequestException("Only draft work tickets can be shared");
    }
    return this.update(id, { status: "sent" });
  }

  async approve(id: string, clientNote?: string) {
    const ticket = (await this.findOne(id)) as WorkTicketRow;
    if (ticket.status !== "sent") {
      throw new BadRequestException("Only sent work tickets can be approved");
    }
    return this.update(id, { status: "approved", clientNote });
  }

  async remove(id: string) {
    const ticket = (await this.findOne(id)) as WorkTicketRow;
    if (ticket.status !== "draft") {
      throw new BadRequestException("Only draft work tickets can be deleted");
    }
    await this.db.query(`DELETE FROM work_tickets WHERE id = $1`, [id]);
    return { ok: true };
  }
}
