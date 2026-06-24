import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class PlatformLoginDto {
  @ApiProperty({ example: "superadmin" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
