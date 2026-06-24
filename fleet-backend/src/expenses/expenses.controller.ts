import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ApiTenantAuth } from "../common/decorators/api-tenant-auth.decorator";
import { ListQueryDto } from "../common/dto/list-query.dto";
import { CreateExpenseDto, UpdateExpenseDto } from "./dto/expense.dto";
import { ExpensesService } from "./expenses.service";

@ApiTags("expenses")
@ApiTenantAuth(UserRole.admin)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  list(@Query() query: ListQueryDto) {
    return this.service.findAll(query);
  }

  @Get("summary")
  summary(@Query("month") month?: string) {
    return this.service.summary(month);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateExpenseDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
