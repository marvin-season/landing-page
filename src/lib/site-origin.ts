import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = firstHeaderValue(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  if (!host) return "http://localhost:3001";
  const forwardedProto = firstHeaderValue(headerList.get("x-forwarded-proto"));
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

function firstHeaderValue(value: string | null): string | undefined {
  const first = value?.split(",")[0]?.trim();
  return first || undefined;
}
