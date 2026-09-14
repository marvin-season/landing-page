import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import linguiConfig from "~/lingui.config";

export const resumeCookieName = "resume-access";
export const resumeSessionMaxAge = 8 * 60 * 60;

// Only the credential digest is stored in source; verification runs on the server.
const credentialsHash =
  "78a4c94a01ce7f420ac9546d1ad8dcbf2417ae88796ae27d24399ad22f0df07b";

export function verifyResumeCredentials(username: string, password: string) {
  const hash = createHash("sha256").update(`${username}:${password}`).digest();
  return timingSafeEqual(hash, Buffer.from(credentialsHash, "hex"));
}

function signExpiry(expiry: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for resume access");

  return createHmac("sha256", secret)
    .update(`resume:${credentialsHash}:${expiry}`)
    .digest("hex");
}

export function createResumeSession() {
  const expiry = String(Math.floor(Date.now() / 1000) + resumeSessionMaxAge);
  return `${expiry}.${signExpiry(expiry)}`;
}

export function hasResumeAccess(token: string | undefined) {
  if (!token || !process.env.AUTH_SECRET) return false;
  const match = token.match(/^(\d{10})\.([a-f0-9]{64})$/);
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false;

  return timingSafeEqual(
    Buffer.from(match[2], "hex"),
    Buffer.from(signExpiry(match[1]), "hex"),
  );
}

export function isResumePath(pathname: string) {
  try {
    return /^\/(?:[^/]+\/)?resume(?:\/|$)/.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

export function getResumeReturnTo(value: unknown) {
  if (typeof value !== "string") return "/resume";
  const pathname = value.replace(/\/$/, "");
  if (
    pathname === "/resume" ||
    linguiConfig.locales.some((locale) => pathname === `/${locale}/resume`)
  ) {
    return pathname;
  }
  return "/resume";
}

export function getResumeAuthorizationUrl(returnTo: string) {
  return `/auth/resume?${new URLSearchParams({
    returnTo: getResumeReturnTo(returnTo),
  })}`;
}
