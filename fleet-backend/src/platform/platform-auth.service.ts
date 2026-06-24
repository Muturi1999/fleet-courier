import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

export type PlatformJwtPayload = {
  sub: string;
  username: string;
  displayName: string;
  scope: "platform";
};

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.platformUser.findFirst({
      where: { username, active: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload: PlatformJwtPayload = {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      scope: "platform",
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: "platform_admin" as const,
      },
    };
  }

  async validate(payload: PlatformJwtPayload) {
    if (payload.scope !== "platform") {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.platformUser.findUnique({ where: { id: payload.sub } });
    if (!user?.active) throw new UnauthorizedException();
    return payload;
  }
}
