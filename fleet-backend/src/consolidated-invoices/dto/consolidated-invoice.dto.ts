import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

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
  @IsString()
  periodStart!: string;

  @ApiProperty()
  @IsString()
  periodEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceDate?: string;

  /** vehicle = single plate batch (default); period = all eligible trips in range */
  @ApiPropertyOptional({ enum: ["vehicle", "period"] })
  @IsOptional()
  @IsString()
  mode?: "vehicle" | "period";

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
