import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class CreateTenantDto {
  @ApiProperty({ example: "acme-logistics" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ example: "Acme Logistics Ltd" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "Contract ref 2026/01" })
  @IsOptional()
  @IsString()
  contract?: string;
}
