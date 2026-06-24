import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
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

  @ApiProperty()
  @IsString()
  details!: string;

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

  @ApiPropertyOptional({ enum: ["", "A/V", "S/S"] })
  @IsOptional()
  @IsString()
  serviceType?: string;
}

export class CreateWorkTicketDto {
  @ApiProperty({ example: "1189105", description: "Work ticket serial number (entered by user)" })
  @IsString()
  @IsNotEmpty()
  serialNo!: string;

  @ApiProperty({ default: "Embakasi" })
  @IsString()
  branch!: string;

  @ApiProperty({ example: "2026-01-07" })
  @IsString()
  tripDate!: string;

  @ApiProperty({ example: "KAV 038M" })
  @IsString()
  plate!: string;

  @ApiProperty({ example: "Mitsubishi" })
  @IsString()
  make!: string;

  @ApiPropertyOptional({ example: "Hillary" })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiProperty()
  @IsString()
  route!: string;

  @ApiPropertyOptional({ enum: ["fixed", "per_km"] })
  @IsOptional()
  @IsIn(["fixed", "per_km"])
  rateType?: string;

  @ApiProperty()
  @IsNumber()
  agreedRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatePassRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headerNotes?: string;

  @ApiProperty({ type: [JourneyLegDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JourneyLegDto)
  legs!: JourneyLegDto[];

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

  @ApiProperty()
  @IsNumber()
  net!: number;

  @ApiProperty()
  @IsNumber()
  vat!: number;

  @ApiProperty()
  @IsNumber()
  total!: number;

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
