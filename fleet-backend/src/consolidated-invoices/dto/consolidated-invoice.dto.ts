import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateConsolidatedInvoiceDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  workTicketIds!: string[];

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

export class ConsolidatedActionDto {
  @ApiProperty({ enum: ["send", "approve", "mark_paid"] })
  @IsString()
  action!: "send" | "approve" | "mark_paid";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientNote?: string;
}
