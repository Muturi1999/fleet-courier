import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateConsolidatedInvoiceDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  workTicketIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceDate?: string;

  /** vehicle = single plate batch (default); period = all eligible trips in range */
  @ApiPropertyOptional({ enum: ["vehicle", "period"] })
  @IsOptional()
  @IsIn(["vehicle", "period"])
  mode?: "vehicle" | "period";

  @ApiPropertyOptional({ description: "Create one vehicle-grouped statement containing all vehicles" })
  @IsOptional()
  @IsBoolean()
  allVehicles?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cls?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  runType?: string;

  @ApiPropertyOptional({ description: "Matches trip route, vehicle run type, or destination" })
  @IsOptional()
  @IsString()
  runRoute?: string;
}

export class ConsolidatedActionDto {
  @ApiProperty({ enum: ["send", "approve", "mark_paid", "reject"] })
  @IsString()
  action!: "send" | "approve" | "mark_paid" | "reject";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientNote?: string;
}

export class ReviseConsolidatedInvoiceDto {
  @ApiProperty()
  @IsString()
  periodStart!: string;

  @ApiProperty()
  @IsString()
  periodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceDate?: string;
}
