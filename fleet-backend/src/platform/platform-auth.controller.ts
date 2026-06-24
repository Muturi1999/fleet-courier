import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlatformLoginDto } from "./dto/platform-login.dto";
import { PlatformAuthService } from "./platform-auth.service";

@ApiTags("platform-auth")
@Controller("platform/auth")
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Super-admin platform login" })
  login(@Body() dto: PlatformLoginDto) {
    return this.auth.login(dto.username, dto.password);
  }
}
