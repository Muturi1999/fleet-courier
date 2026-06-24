import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { NotificationsQueryDto } from "./dto/notifications-query.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiTenantAuth(UserRole.admin, UserRole.client)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List workflow notifications" })
  list(@Query() query: NotificationsQueryDto) {
    return this.service.findAll(query, query.audience, query.unread === "true");
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string) {
    return this.service.markRead(id);
  }

  @Post()
  @ApiOperation({ summary: "Bulk actions (mark_all_read)" })
  bulk(@Body() body: { action: string; audience?: string }) {
    if (body.action === "mark_all_read" && body.audience) {
      return this.service.markAllRead(body.audience);
    }
    return { ok: false, error: "Invalid action" };
  }
}
