import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty()
  @IsString()
  pickupAddress!: string;

  @ApiProperty()
  @IsString()
  deliveryAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeHint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryDueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cargoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quotedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
