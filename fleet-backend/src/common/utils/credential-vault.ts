import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.PLATFORM_CREDENTIAL_KEY ?? process.env.JWT_SECRET ?? "dev-credential-key";
  return scryptSync(secret, "swiftfleet-managed-credentials", 32);
}

export function encryptPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptPassword(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
