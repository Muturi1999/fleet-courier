import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class OnboardAdminDto {
  @ApiProperty({ example: "admin" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9._-]+$/)
  username!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "Fleet Manager" })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class OnboardCompanyDto {
  @ApiPropertyOptional({ example: "Road Network Transporters Ltd" })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: "P.O. Box 4622-00200, Nairobi" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Nairobi, Kenya" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "P051470271Y" })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ example: "Tel: 020 2011330" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "0161681P" })
  @IsOptional()
  @IsString()
  vatNo?: string;

  @ApiPropertyOptional({ example: "accounts@rnt.co.ke" })
  @IsOptional()
  @ValidateIf((_, value) => value != null && String(value).trim() !== "")
  @IsEmail()
  email?: string;
}

export class OnboardPartnerDto {
  @ApiPropertyOptional({ example: "G4S Courier" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "G4S Courier Services Kenya Ltd" })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: "G4S House, Waiyaki Way" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Nairobi, Kenya" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "P051987654G" })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ example: "accounts@g4s.co.ke" })
  @IsOptional()
  @ValidateIf((_, value) => value != null && String(value).trim() !== "")
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "Accounts Payable" })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ example: "g4s", description: "Partner portal login username" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._-]+$/)
  username?: string;
}

export class OnboardTenantDto {
  @ApiProperty({ example: "road-network-transporters" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ example: "Road Network Transporters" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "G4S-RNT-2026-001" })
  @IsOptional()
  @IsString()
  contract?: string;

  @ApiProperty({ type: OnboardAdminDto })
  @ValidateNested()
  @Type(() => OnboardAdminDto)
  admin!: OnboardAdminDto;

  @ApiPropertyOptional({ type: OnboardCompanyDto, description: "Fleet operator billing identity (invoice supplier)" })
  @ValidateNested()
  @Type(() => OnboardCompanyDto)
  @IsOptional()
  company?: OnboardCompanyDto;

  @ApiPropertyOptional({ type: OnboardPartnerDto, description: "First partner you bill (invoice client), e.g. G4S" })
  @ValidateNested()
  @Type(() => OnboardPartnerDto)
  @IsOptional()
  partner?: OnboardPartnerDto;

  @ApiPropertyOptional({ description: "Create partner portal login for invoice & work-ticket approval" })
  @IsOptional()
  @IsBoolean()
  createPartnerPortal?: boolean;

  @ApiPropertyOptional({ minLength: 8, description: "Password for partner portal user" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  partnerPassword?: string;
}
