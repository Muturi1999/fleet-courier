import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { decryptPassword, encryptPassword } from "../utils/credential-vault";

@Injectable()
export class ManagedCredentialService {
  constructor(private readonly prisma: PrismaService) {}

  async store(userId: string, plainPassword: string) {
    const passwordEncrypted = encryptPassword(plainPassword);
    await this.prisma.managedCredential.upsert({
      where: { userId },
      create: { userId, passwordEncrypted },
      update: { passwordEncrypted },
    });
  }

  async reveal(userId: string): Promise<string | null> {
    const row = await this.prisma.managedCredential.findUnique({ where: { userId } });
    if (!row) return null;
    try {
      return decryptPassword(row.passwordEncrypted);
    } catch {
      return null;
    }
  }
}
