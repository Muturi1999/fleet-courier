import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../../auth/auth.service";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as JwtPayload;
});
