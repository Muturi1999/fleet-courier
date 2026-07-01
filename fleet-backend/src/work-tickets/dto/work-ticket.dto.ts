import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class JourneyLegDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  openingMileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officerAuthorising?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fuelDrawn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  closingMileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officerConfirming?: string;

  @ApiPropertyOptional({ enum: ["", "A/V", "S/S"] })
  @IsOptional()
  @IsString()
  journeyType?: string;

  /** @deprecated use journeyType */
  @ApiPropertyOptional({ enum: ["", "A/V", "S/S"] })
  @IsOptional()
  @IsString()
  serviceType?: string;
}

export class CreateWorkTicketDto {
  @ApiPropertyOptional({ example: "1189105" })
  @IsOptional()
  @IsString()
  serialNo?: string;

  @ApiPropertyOptional({ default: "Embakasi" })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: "2026-01-07" })
  @IsOptional()
  @IsString()
  tripDate?: string;

  @ApiPropertyOptional({ example: "KAV 038M" })
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiPropertyOptional({ example: "Mitsubishi" })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({ example: "FRR 90" })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: "Hillary" })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ enum: ["fixed", "per_km"] })
  @IsOptional()
  @IsIn(["fixed", "per_km"])
  rateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  agreedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatePassRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headerNotes?: string;

  @ApiPropertyOptional({ type: [JourneyLegDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JourneyLegDto)
  legs?: JourneyLegDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vehicleCondition?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  privateKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  officialKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  net?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverSignature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentName?: string;

  @ApiPropertyOptional({ enum: ["draft", "sent", "approved", "rejected"] })
  @IsOptional()
  @IsIn(["draft", "sent", "approved", "rejected"])
  status?: string;
}

export class UpdateWorkTicketDto extends PartialType(CreateWorkTicketDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientNote?: string;
}
