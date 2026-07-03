import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { FeatureGuard } from "../common/guards/feature.guard";
import { OpsService } from "./ops.service";

@ApiTags("ops")
@ApiTenantAuth(UserRole.admin)
@UseGuards(FeatureGuard)
@Controller("ops")
export class OpsController {
  constructor(private readonly service: OpsService) {}

  @Get("analytics")
  @RequireFeature("fleet_extended")
  analytics() {
    return this.service.analytics();
  }

  @Get("insights")
  @RequireFeature("ai_ops")
  insights() {
    return this.service.listInsights();
  }

  @Post("insights/refresh")
  @RequireFeature("ai_ops")
  refreshInsights() {
    return this.service.refreshInsights();
  }

  @Patch("insights/:id/dismiss")
  @RequireFeature("ai_ops")
  dismiss(@Param("id") id: string) {
    return this.service.dismissInsight(id);
  }

  @Get("dispatch-suggestions/:orderId")
  @RequireFeature("ai_ops")
  suggestions(@Param("orderId") orderId: string) {
    return this.service.dispatchSuggestions(orderId);
  }

  @Post("quote")
  @RequireFeature("customer_shipments")
  quote(@Body() body: { pickupAddress: string; deliveryAddress: string; weightKg?: number }) {
    return this.service.quoteShipment(body);
  }
}
