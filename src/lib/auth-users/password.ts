import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const r = 8;
const p = 1;
const keyLength = 32;

function scryptHash(
  password: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number } = { N, r, p },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  if (!password) throw new Error("password is empty");

  const salt = randomBytes(16);
  const key = await scryptHash(password, salt, keyLength);
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  if (!password || !encoded) return false;

  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const parsedN = Number(parts[1]);
  const parsedR = Number(parts[2]);
  const parsedP = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? "", "base64url");
  const expected = Buffer.from(parts[5] ?? "", "base64url");
  if (!parsedN || !parsedR || !parsedP || !salt.length || !expected.length) {
    return false;
  }

  const key = await scryptHash(password, salt, expected.length, {
    N: parsedN,
    r: parsedR,
    p: parsedP,
  });
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}
