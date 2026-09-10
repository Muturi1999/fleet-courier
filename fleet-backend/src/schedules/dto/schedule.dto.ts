import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateScheduleDto {
  @ApiProperty({ example: "KBL 094E" })
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiProperty({ example: "7T" })
  @IsOptional()
  @IsString()
  cls?: string;

  @ApiProperty({ example: "NAIROBI" })
  @IsOptional()
  @IsString()
  dest?: string;

  @ApiProperty({ example: "Morning", description: "Morning, Afternoon, or custom run label" })
  @IsOptional()
  @IsString()
  runType?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(0)
  days?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  vat?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({ description: "Billing period label", example: "May 2026" })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: "Billing period start date", example: "2026-05-01" })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: "Billing period end date", example: "2026-05-31" })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDate?: string;

  @ApiPropertyOptional({ enum: ["saved", "draft"] })
  @IsOptional()
  @IsIn(["saved", "draft"])
  status?: string;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
