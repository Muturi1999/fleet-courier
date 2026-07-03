import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class RegisterDeviceDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty()
  @IsString()
  externalId!: string;
}

export class IngestPositionDto {
  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiProperty()
  @IsNumber()
  latitude!: number;

  @ApiProperty()
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  speedKph?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ignition?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class SimulateFleetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  count?: number;
}
