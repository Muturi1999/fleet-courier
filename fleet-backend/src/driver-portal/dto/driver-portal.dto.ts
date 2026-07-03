import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class DriverLoginDto {
  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsString()
  pin!: string;
}

export class DriverTripUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podSignature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podPhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podNotes?: string;
}
