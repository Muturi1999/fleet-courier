import { Injectable, UnauthorizedException } from "@nestjs/common";
import { TenantDatabaseService } from "../common/database/tenant-database.service";
import { DispatchService } from "../dispatch/dispatch.service";
import { DriverLoginDto, DriverTripUpdateDto } from "./dto/driver-portal.dto";

@Injectable()
export class DriverPortalService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly dispatch: DispatchService,
  ) {}

  async login(dto: DriverLoginDto) {
    const driver = await this.db.queryOne(
      `SELECT id, name, phone, active FROM drivers WHERE phone = $1 AND portal_pin = $2 AND active = TRUE`,
      [dto.phone, dto.pin],
    );
    if (!driver) throw new UnauthorizedException("Invalid driver credentials");
    return { driverId: driver.id, name: driver.name, phone: driver.phone };
  }

  trips(driverId: string) {
    return this.dispatch.driverTrips(driverId);
  }

  async updateTrip(driverId: string, assignmentId: string, dto: DriverTripUpdateDto) {
    const row = await this.db.queryOne(
      `SELECT id FROM dispatch_assignments WHERE id = $1 AND driver_id = $2`,
      [assignmentId, driverId],
    );
    if (!row) throw new UnauthorizedException("Trip not assigned to this driver");
    return this.dispatch.update(assignmentId, dto);
  }
}
