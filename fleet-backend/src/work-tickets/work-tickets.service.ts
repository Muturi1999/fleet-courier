import { randomUUID } from "crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  addDateClause,
  addDestinationClause,
  addSearchClause,
  addStatusClause,
  wantsFullList,
} from "../common/database/list-query.helper";
import { queryList } from "../common/database/pagination.helper";
import { SEQUENCE_KEYS, TenantSequenceService } from "../common/database/tenant-sequence.service";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { PaginatedResult } from "../common/dto/pagination.dto";
import { PartnersService } from "../partners/partners.service";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { WorkflowsService } from "../workflows/workflows.service";
import { WorkTicketInvoiceService } from "./work-ticket-invoice.service";
import { CreateWorkTicketDto, JourneyLegDto, UpdateWorkTicketDto } from "./dto/work-ticket.dto";

type WorkTicketRow = Record<string, unknown> & {
  id: string;
  serial_no: string;
  plate: string;
  driver_name: string;
  route: string;
  trip_date: string;
  net: string | number;
  vat: string | number;
  total: string | number;
  status: string;
  legs: JourneyLegDto[];
  partner_id?: string | null;
};

@Injectable()
export class WorkTicketsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly workflows: WorkflowsService,
    private readonly partners: PartnersService,
    private readonly ticketInvoices: WorkTicketInvoiceService,
    private readonly sequences: TenantSequenceService,
  ) {}

  private buildWhere(query: ListQueryDto, status?: string) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    i = addSearchClause(
      clauses,
      params,
      i,
      ["serial_no", "plate", "driver_name", "route"],
      query.search,
    );
    i = addDestinationClause(clauses, params, i, "route", query.destination);
    i = addDateClause(clauses, params, i, "trip_date", query.date);
    i = addStatusClause(clauses, params, i, status);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return { where, params };
  }

  async findAll(
    query: ListQueryDto,
    status?: string,
  ): Promise<PaginatedResult<WorkTicketRow> | WorkTicketRow[]> {
    const { where, params } = this.buildWhere(query, status);

    if (wantsFullList(query)) {
      return this.db.queryAll(`SELECT * FROM work_tickets ${where} ORDER BY created_at DESC, id DESC`, params);
    }

    return queryList<WorkTicketRow>(this.db, query, {
      table: "work_tickets",
      where,
      params,
      orderBy: "created_at DESC, id DESC",
    });
  }

  async summary() {
    const rows = await this.db.queryAll<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM work_tickets GROUP BY status`,
    );
    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const n = parseInt(row.count, 10);
      counts[row.status] = n;
      total += n;
    }
    return {
      total,
      draft: counts.draft ?? 0,
      sent: counts.sent ?? 0,
      approved: counts.approved ?? 0,
      rejected: counts.rejected ?? 0,
      invoiced: counts.invoiced ?? 0,
    };
  }

  async findOne(id: string) {
    const row = await this.db.queryOne(`SELECT * FROM work_tickets WHERE id = $1`, [id]);
    if (!row) throw new NotFoundException("Work ticket not found");
    return row;
  }

  async nextSerial(): Promise<string> {
    const n = await this.sequences.next(SEQUENCE_KEYS.workTicketSerial);
    return String(n);
  }

  private normalizeLegs(legs: JourneyLegDto[] = []) {
    return legs.map((leg) => ({
      id: leg.id ?? randomUUID(),
      details: leg.details ?? "",
      openingMileage: leg.openingMileage ?? 0,
      timeOut: leg.timeOut ?? "",
      officerAuthorising: leg.officerAuthorising ?? "",
      fuelDrawn: leg.fuelDrawn ?? "",
      timeIn: leg.timeIn ?? "",
      closingMileage: leg.closingMileage ?? 0,
      serviceDone: leg.serviceDone ?? "",
      officerConfirming: leg.officerConfirming ?? "",
      journeyType: leg.journeyType ?? leg.serviceType ?? "",
    }));
  }

  private normalizeVehicleCondition(raw?: Record<string, string> | null) {
    const defaults = {
      petrolDiesel: "",
      oil: "",
      seatBelt: "",
      water: "",
      battery: "",
      tyres: "",
      safety: "",
      triangles: "",
      body: "",
      spareWheel: "",
      fireExtinguisher: "",
      tools: "",
    };
    return { ...defaults, ...(raw ?? {}) };
  }

  private async resolveSerialNo(serialNo?: string) {
    const trimmed = serialNo?.trim();
    if (trimmed) return trimmed;
    return String(await this.sequences.next(SEQUENCE_KEYS.workTicketSerial));
  }

  async create(dto: CreateWorkTicketDto) {
    const serialNo = await this.resolveSerialNo(dto.serialNo);

    const duplicate = await this.db.queryOne(`SELECT id FROM work_tickets WHERE serial_no = $1`, [serialNo]);
    if (duplicate) throw new ConflictException(`Work ticket serial ${serialNo} already exists`);

    const legs = this.normalizeLegs(dto.legs);
    const tripDate = dto.tripDate?.trim() || new Date().toISOString().slice(0, 10);
    const amounts = {
      net: dto.net ?? 0,
      vat: dto.vat ?? 0,
      total: dto.total ?? 0,
    };

    return this.db.withTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO work_tickets (
        serial_no, branch, trip_date, plate, make, vehicle_type, driver_name, route,
        rate_type, agreed_rate, gate_pass_ref, header_notes, legs, vehicle_condition,
        private_km, official_km, net, vat, total, driver_signature, certification_date,
        attachment_name, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
        [
          serialNo,
          dto.branch?.trim() || "Embakasi",
          tripDate,
          dto.plate?.trim() || "",
          dto.make?.trim() || "",
          dto.vehicleType?.trim() || null,
          dto.driverName?.trim() || "",
          dto.route?.trim() || "",
          dto.rateType ?? "fixed",
          dto.agreedRate ?? 0,
          dto.gatePassRef ?? null,
          dto.headerNotes ?? null,
          JSON.stringify(legs),
          JSON.stringify(this.normalizeVehicleCondition(dto.vehicleCondition)),
          dto.privateKm ?? 0,
          dto.officialKm ?? 0,
          amounts.net,
          amounts.vat,
          amounts.total,
          dto.driverSignature?.trim() || null,
          dto.certificationDate?.trim() || null,
          dto.attachmentName ?? null,
          dto.status ?? "draft",
        ],
      );
      const ticket = res.rows[0] as WorkTicketRow;
      await this.ticketInvoices.createForWorkTicket(ticket, client);
      return ticket;
    });
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
      vehicleType: "vehicle_type",
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
      driverSignature: "driver_signature",
      certificationDate: "certification_date",
      attachmentName: "attachment_name",
      status: "status",
      clientNote: "client_note",
    };

    for (const [key, col] of Object.entries(map)) {
      const val = (dto as Record<string, unknown>)[key];
      if (val !== undefined) {
        if (key === "serialNo" && typeof val === "string") {
          const serialNo = val.trim();
          if (!serialNo) continue;
          const duplicate = await this.db.queryOne(
            `SELECT id FROM work_tickets WHERE serial_no = $1 AND id <> $2`,
            [serialNo, id],
          );
          if (duplicate) throw new ConflictException(`Work ticket serial ${serialNo} already exists`);
        }
        fields.push(`${col} = $${i++}`);
        values.push(
          key === "serialNo" && typeof val === "string"
            ? val.trim()
            : typeof val === "string"
              ? val.trim()
              : val,
        );
      }
    }

    if (dto.legs !== undefined) {
      fields.push(`legs = $${i++}`);
      values.push(JSON.stringify(this.normalizeLegs(dto.legs)));
    }

    if (dto.vehicleCondition !== undefined) {
      fields.push(`vehicle_condition = $${i++}`);
      values.push(JSON.stringify(this.normalizeVehicleCondition(dto.vehicleCondition)));
    }

    if (dto.status === "sent" && !(before as WorkTicketRow).partner_id) {
      const tenant = TenantContextStorage.getOrThrow();
      const partnerId = await this.partners.defaultPartnerId(tenant.id);
      if (partnerId) {
        fields.push(`partner_id = $${i++}`);
        values.push(partnerId);
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const updated = (await this.db.queryOne(
      `UPDATE work_tickets SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    )) as WorkTicketRow;

    await this.workflows.processWorkTicketStatusChange(before, updated);
    if (before.status === "draft") {
      await this.ticketInvoices.syncFromWorkTicket(updated as WorkTicketRow);
    }
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
    await this.db.withTransaction(async (client) => {
      await this.ticketInvoices.deleteForWorkTicket(id, client);
      await client.query(`DELETE FROM work_tickets WHERE id = $1`, [id]);
    });
    return { ok: true };
  }
}
