import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from "@nestjs/common";
import { ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { CreateScheduleDto, UpdateScheduleDto } from "./dto/schedule.dto";
import { SchedulesService } from "./schedules.service";

@ApiTags("schedules")
@ApiTenantAuth(UserRole.admin)
@Controller("schedules")
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: "List schedule entries (paginated by default; ?all=true for full list)" })
  list(@Query() query: ListQueryDto) {
    return this.service.findAll(query);
  }

  @Get("summary")
  summary() {
    return this.service.summary();
  }

  @Get("export/preview")
  @ApiOperation({
    summary:
      "Preview schedule export as JSON (same filters and grouping as .xlsx export).",
  })
  exportPreview(@Query() query: ListQueryDto) {
    return this.service.exportPreview(query);
  }

  @Get("export")
  @ApiOperation({
    summary:
      "Export schedule entries as .xlsx (same filters as list). Grouped by vehicle with a blank row between groups; grand total only at bottom.",
  })
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @Header("Content-Disposition", 'attachment; filename="schedule-entries.xlsx"')
  async export(@Query() query: ListQueryDto): Promise<StreamableFile> {
    const buffer = await this.service.exportXlsx(query);
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: 'attachment; filename="schedule-entries.xlsx"',
    });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.service.create(dto);
  }

  @Post("import")
  @ApiOperation({ summary: "Bulk import schedule rows from Excel/CSV export" })
  importBulk(@Body() body: { rows: CreateScheduleDto[] }) {
    return this.service.importBulk(body.rows ?? []);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
