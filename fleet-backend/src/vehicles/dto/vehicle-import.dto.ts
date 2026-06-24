import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VehicleImportRowDto {
  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiProperty()
  @IsString()
  cls!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  runType?: string;

  @ApiPropertyOptional({ enum: ["active", "inactive", "suspended"] })
  @IsOptional()
  @IsIn(["active", "inactive", "suspended"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  client?: string;
}

export class VehicleImportDto {
  @ApiProperty({ type: [VehicleImportRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleImportRowDto)
  rows!: VehicleImportRowDto[];
}
