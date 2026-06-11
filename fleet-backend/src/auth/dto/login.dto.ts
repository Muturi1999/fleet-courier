import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "g4s-kenya" })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @ApiProperty({ example: "admin" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: "admin123" })
  @IsString()
  @MinLength(4)
  password!: string;
}
