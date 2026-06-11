import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  rate7!: number;

  @ApiProperty()
  @IsNumber()
  rate15!: number;

  @ApiPropertyOptional({ enum: ["nairobi", "upcountry"] })
  @IsOptional()
  @IsIn(["nairobi", "upcountry"])
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  trips?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total?: number;

  @ApiPropertyOptional({ enum: ["active", "inactive"] })
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: string;
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {}
