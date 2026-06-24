import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreatePartnerDto {
  @ApiProperty({ example: "G4S Courier" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "g4s" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Partner portal login username" })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._-]+$/)
  portalUsername?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  portalPassword?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  createPortalLogin?: boolean;
}
