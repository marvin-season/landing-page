import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// biome-ignore lint/performance/noBarrelFile: package public API entrypoint.
export { isDevelopment, isProduction } from "./env";
export { getApiUrl, getBaseUrl, type RequestOptions, request } from "./request";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export { sleep as delay };
