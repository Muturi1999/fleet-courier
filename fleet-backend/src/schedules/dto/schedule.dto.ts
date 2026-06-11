import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateScheduleDto {
  @ApiProperty({ example: "KBL 094E" })
  @IsString()
  plate!: string;

  @ApiProperty({ example: "7T" })
  @IsString()
  cls!: string;

  @ApiProperty({ example: "NAIROBI" })
  @IsString()
  dest!: string;

  @ApiProperty({ enum: ["Morning", "Afternoon"] })
  @IsIn(["Morning", "Afternoon"])
  runType!: string;

  @ApiProperty()
  @IsNumber()
  rate!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  days!: number;

  @ApiProperty()
  @IsNumber()
  cost!: number;

  @ApiProperty()
  @IsNumber()
  vat!: number;

  @ApiProperty()
  @IsNumber()
  total!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  month?: string;

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
