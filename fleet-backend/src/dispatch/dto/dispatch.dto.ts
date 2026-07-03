import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateDispatchDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty()
  @IsUUID()
  driverId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripNotes?: string;
}

export class UpdateDispatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podSignature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podNotes?: string;
}

export class ReassignDispatchDto {
  @ApiProperty()
  @IsUUID()
  driverId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripNotes?: string;
}
