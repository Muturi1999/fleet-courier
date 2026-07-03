import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateMaintenanceScheduleDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiProperty()
  @IsString()
  serviceType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  intervalKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  intervalDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastServiceAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lastOdometerKm?: number;
}

export class UpdateMaintenanceScheduleDto extends PartialType(CreateMaintenanceScheduleDto) {}

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  garageName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  partsCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  laborCost?: number;
}

export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  closedAt?: string;
}
