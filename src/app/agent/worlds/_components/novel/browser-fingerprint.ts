"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

let pending: Promise<string> | undefined;

/** 懒加载并缓存 FingerprintJS visitorId，供小说额度校验使用。 */
export function getBrowserFingerprint() {
  if (!pending) {
    pending = FingerprintJS.load()
      .then((agent) => agent.get())
      .then((result) => result.visitorId)
      .catch((error) => {
        pending = undefined;
        throw error;
      });
  }
  return pending;
}
