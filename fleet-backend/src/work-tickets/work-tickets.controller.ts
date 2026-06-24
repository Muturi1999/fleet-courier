import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { CreateWorkTicketDto, UpdateWorkTicketDto } from "./dto/work-ticket.dto";
import { WorkTicketsService } from "./work-tickets.service";

@ApiTags("work-tickets")
@Controller("work-tickets")
export class WorkTicketsController {
  constructor(private readonly service: WorkTicketsService) {}

  @Get()
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  @ApiOperation({ summary: "List work tickets (paginated by default; ?all=true for legacy full list)" })
  list(@Query() query: ListQueryDto, @Query("status") status?: string) {
    return this.service.findAll(query, status);
  }

  @Get("summary")
  @ApiTenantAuth(UserRole.admin)
  summary() {
    return this.service.summary();
  }

  @Get("next-serial")
  @ApiTenantAuth(UserRole.admin)
  nextSerial() {
    return this.service.nextSerial();
  }

  @Get(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiTenantAuth(UserRole.admin)
  create(@Body() dto: CreateWorkTicketDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  update(@Param("id") id: string, @Body() dto: UpdateWorkTicketDto) {
    return this.service.update(id, dto);
  }

  @Post(":id/share")
  @ApiTenantAuth(UserRole.admin)
  @ApiOperation({ summary: "Share draft work ticket with G4S client" })
  share(@Param("id") id: string) {
    return this.service.share(id);
  }

  @Post(":id/approve")
  @ApiTenantAuth(UserRole.admin, UserRole.client)
  @ApiOperation({ summary: "Approve a sent work ticket" })
  approve(@Param("id") id: string, @Body("clientNote") clientNote?: string) {
    return this.service.approve(id, clientNote);
  }

  @Delete(":id")
  @ApiTenantAuth(UserRole.admin)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
