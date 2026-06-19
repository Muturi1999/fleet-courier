import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

export type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  tenantSchema: string;
  tenantName: string;
  displayName: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug, active: true },
    });
    if (!tenant) throw new UnauthorizedException("Invalid credentials");

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, username: dto.username, active: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantSchema: tenant.schema,
      tenantName: tenant.name,
      displayName: user.displayName,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
      },
    };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });
    if (!user?.active || !user.tenant.active) {
      throw new UnauthorizedException();
    }
    if (user.tenantId !== payload.tenantId || user.tenant.schema !== payload.tenantSchema) {
      throw new UnauthorizedException("Workspace membership changed — sign in again");
    }
    return {
      ...payload,
      tenantSlug: user.tenant.slug,
      tenantSchema: user.tenant.schema,
      tenantName: user.tenant.name,
    };
  }
}
