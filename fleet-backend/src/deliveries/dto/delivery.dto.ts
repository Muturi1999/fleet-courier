import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateLocalDeliveryDto {
  @ApiProperty({ example: "KBL 094E" })
  @IsString()
  reg!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  m!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  a!: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  total!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;
}

export class UpdateLocalDeliveryDto extends PartialType(CreateLocalDeliveryDto) {}

export class CreateSafariDto {
  @ApiProperty()
  @IsString()
  reg!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  total!: number;

  @ApiPropertyOptional({ enum: ["", "VERIFY", "DAY"] })
  @IsOptional()
  @IsIn(["", "VERIFY", "DAY"])
  flag?: string;

  @ApiProperty()
  @IsString()
  dest!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;
}

export class UpdateSafariDto extends PartialType(CreateSafariDto) {}
