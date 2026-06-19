import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateExpenseDto {
  @ApiProperty({ example: "2026-03-22" })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: ["fuel", "maintenance", "insurance", "salaries", "tolls", "other"] })
  @IsIn(["fuel", "maintenance", "insurance", "salaries", "tolls", "other"])
  category!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ example: 890000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "KBH 667W" })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiProperty({ example: "Mar 2026" })
  @IsString()
  month!: string;

  @ApiPropertyOptional({ enum: ["recorded", "approved", "paid"] })
  @IsOptional()
  @IsIn(["recorded", "approved", "paid"])
  status?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
