
export async function request<T>(url: string): Promise<T> {

  const apiUrl = getApiUrl(url);
  const res = await fetch(apiUrl);
  return res.json() as Promise<T>;
}

// src/lib/api-client.ts (示例)
export const getApiUrl = (path: string) => {
  
  // 如果是浏览器端，使用相对路径利用 rewrites
  if (typeof window !== "undefined") {
    return `/api-remote${path}`;
  }
  // 如果是服务端，直接连接外部 API 地址
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  // 将 /api-remote 替换为真实的远程地址，或者直接拼接
  return `${baseUrl}${path}`;
};

