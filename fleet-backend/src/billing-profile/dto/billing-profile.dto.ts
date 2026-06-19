import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class BillingPartyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty()
  @IsString()
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vatNo?: string;

  @ApiProperty()
  @IsString()
  pin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractRef?: string;
}

export class UpdateBillingProfileDto {
  @ApiProperty({ type: BillingPartyDto })
  @ValidateNested()
  @Type(() => BillingPartyDto)
  supplier!: BillingPartyDto;

  @ApiProperty({ type: BillingPartyDto })
  @ValidateNested()
  @Type(() => BillingPartyDto)
  client!: BillingPartyDto;
}
