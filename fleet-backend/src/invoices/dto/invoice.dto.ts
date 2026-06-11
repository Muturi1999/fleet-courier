import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateInvoiceDto {
  @ApiProperty({ example: "#19299" })
  @IsString()
  invoiceNo!: string;

  @ApiProperty()
  @IsString()
  plate!: string;

  @ApiProperty()
  @IsString()
  cls!: string;

  @ApiProperty()
  @IsString()
  route!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  days!: number;

  @ApiProperty()
  @IsNumber()
  net!: number;

  @ApiProperty()
  @IsNumber()
  vat!: number;

  @ApiProperty()
  @IsNumber()
  total!: number;

  @ApiPropertyOptional({ enum: ["draft", "sent", "approved", "paid", "pending", "rejected"] })
  @IsOptional()
  @IsIn(["draft", "sent", "approved", "paid", "pending", "rejected"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryNoteNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientNote?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}
