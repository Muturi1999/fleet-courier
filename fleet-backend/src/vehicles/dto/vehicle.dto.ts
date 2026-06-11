import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiProperty()
  @IsString()
  cls!: string;

  @ApiProperty()
  @IsString()
  runType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  runs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dests?: string[];

  @ApiPropertyOptional({ enum: ["active", "inactive", "suspended"] })
  @IsOptional()
  @IsIn(["active", "inactive", "suspended"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  client?: string;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
