const CLIENT_BASE = "/api-remote";

/** 获取 API 的 baseUrl：客户端为 /api-remote，服务端为 NEXT_PUBLIC_API_BASE_URL（已去除尾部斜杠） */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return CLIENT_BASE;
  }
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url || typeof url !== "string") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required for server-side requests",
    );
  }
  return url.replace(/\/$/, "");
}

export function getApiUrl(path: string): string {
  if(path.includes("/api/")) {
    return path;
  }
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export type RequestOptions = RequestInit & {
  /** 非 2xx 时是否抛出错误，默认 true */
  throwOnError?: boolean;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { throwOnError = true, ...init } = options;
  const url = getApiUrl(path);
  const res = await fetch(url, init);

  if (!res.ok && throwOnError) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${errText || res.statusText}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}
