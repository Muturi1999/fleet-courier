const { createCipheriv, createDecipheriv, randomBytes, scryptSync } = require("crypto");

const ALGO = "aes-256-gcm";

function deriveKey() {
  const secret = process.env.PLATFORM_CREDENTIAL_KEY ?? process.env.JWT_SECRET ?? "dev-credential-key";
  return scryptSync(secret, "swiftfleet-managed-credentials", 32);
}

function encryptPassword(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

module.exports = { encryptPassword };
