import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateRateDto {
  @ApiProperty()
  @IsString()
  route!: string;

  @ApiProperty()
  @IsString()
  cls!: string;

  @ApiProperty()
  @IsNumber()
  rate!: number;

  @ApiProperty()
  @IsString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ enum: ["active", "inactive"] })
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: string;

  @ApiPropertyOptional({ enum: ["nairobi", "upcountry"] })
  @IsOptional()
  @IsIn(["nairobi", "upcountry"])
  category?: string;
}

export class UpdateRateDto extends PartialType(CreateRateDto) {}
