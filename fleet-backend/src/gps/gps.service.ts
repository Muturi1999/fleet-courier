import { Injectable, NotFoundException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { IngestPositionDto, RegisterDeviceDto } from "./dto/gps.dto";

@Injectable()
export class GpsService {
  constructor(private readonly db: TenantDatabaseService) {}

  listDevices() {
    return this.db.queryAll(`SELECT * FROM gps_devices ORDER BY plate`);
  }

  async registerDevice(dto: RegisterDeviceDto) {
    return this.db.queryOne(
      `INSERT INTO gps_devices (vehicle_id, plate, provider, external_id)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (provider, external_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id, plate = EXCLUDED.plate, active = TRUE, updated_at = NOW()
       RETURNING *`,
      [dto.vehicleId, dto.plate, dto.provider ?? "traccar", dto.externalId],
    );
  }

  async ingestPosition(dto: IngestPositionDto) {
    let device = dto.externalId
      ? await this.db.queryOne(`SELECT * FROM gps_devices WHERE external_id = $1`, [dto.externalId])
      : await this.db.queryOne(`SELECT * FROM gps_devices WHERE plate = $1 AND active = TRUE LIMIT 1`, [dto.plate]);

    if (!device) {
      device = await this.db.queryOne(
        `INSERT INTO gps_devices (vehicle_id, plate, provider, external_id)
         VALUES (NULL, $1, 'manual', $2) RETURNING *`,
        [dto.plate, `manual-${dto.plate}`],
      );
    }

    const recordedAt = dto.recordedAt ?? new Date().toISOString();
    const pos = await this.db.queryOne(
      `INSERT INTO vehicle_positions (device_id, plate, recorded_at, latitude, longitude, speed_kph, heading, ignition)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        device?.id,
        dto.plate,
        recordedAt,
        dto.latitude,
        dto.longitude,
        dto.speedKph ?? null,
        dto.heading ?? null,
        dto.ignition ?? null,
      ],
    );

    await this.db.queryOne(
      `UPDATE gps_devices SET last_seen_at = $2, updated_at = NOW() WHERE id = $1`,
      [device?.id, recordedAt],
    );

    if ((dto.speedKph ?? 0) > 100) {
      await this.db.queryOne(
        `INSERT INTO gps_alerts (plate, alert_type, message) VALUES ($1,'overspeed',$2)`,
        [dto.plate, `Speed ${dto.speedKph} km/h recorded`],
      );
    }

    return pos;
  }

  /** Traccar-compatible webhook body (positions array). */
  async ingestTraccarWebhook(body: { positions?: Record<string, unknown>[] }) {
    const positions = body.positions ?? [];
    const results = [];
    for (const p of positions) {
      const plate = (p.deviceId as string) ?? (p.plate as string);
      if (!plate) continue;
      results.push(
        await this.ingestPosition({
          plate: String(plate),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          speedKph: p.speed != null ? Number(p.speed) * 1.852 : undefined,
          heading: p.course != null ? Number(p.course) : undefined,
          ignition: Boolean(p.attributes && (p.attributes as Record<string, unknown>).ignition),
          recordedAt: p.fixTime as string | undefined,
          externalId: String(p.deviceId ?? plate),
        }),
      );
    }
    return { ingested: results.length };
  }

  livePositions() {
    return this.db.queryAll(
      `SELECT DISTINCT ON (plate) plate, latitude, longitude, speed_kph, heading, recorded_at
       FROM vehicle_positions ORDER BY plate, recorded_at DESC`,
    );
  }

  positionsForPlate(plate: string, limit = 100) {
    return this.db.queryAll(
      `SELECT * FROM vehicle_positions WHERE plate = $1 ORDER BY recorded_at DESC LIMIT $2`,
      [plate, limit],
    );
  }

  openAlerts() {
    return this.db.queryAll(
      `SELECT * FROM gps_alerts WHERE acknowledged = FALSE ORDER BY created_at DESC LIMIT 50`,
    );
  }

  async acknowledgeAlert(id: string) {
    const row = await this.db.queryOne(
      `UPDATE gps_alerts SET acknowledged = TRUE WHERE id = $1 RETURNING *`,
      [id],
    );
    if (!row) throw new NotFoundException("Alert not found");
    return row;
  }

  async simulateFleet(count = 5) {
    const vehicles = await this.db.queryAll<{ plate: string; id: string }>(
      `SELECT id, plate FROM vehicles WHERE status = 'active' ORDER BY created_at DESC LIMIT $1`,
      [count],
    );
    const baseLat = -1.2921;
    const baseLng = 36.8219;
    for (const v of vehicles) {
      await this.registerDevice({ vehicleId: v.id, plate: v.plate, externalId: `sim-${v.plate}` });
      await this.ingestPosition({
        plate: v.plate,
        latitude: baseLat + (Math.random() - 0.5) * 0.1,
        longitude: baseLng + (Math.random() - 0.5) * 0.1,
        speedKph: Math.round(20 + Math.random() * 60),
        externalId: `sim-${v.plate}`,
      });
    }
    return { simulated: vehicles.length };
  }
}
