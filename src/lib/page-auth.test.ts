import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAuthorizationUrl,
  getProtectedPage,
  getSafeReturnTo,
  isProtectedPath,
} from "./page-auth";

describe("isProtectedPath", () => {
  it("matches resume with and without locale prefix", () => {
    assert.equal(isProtectedPath("/resume"), true);
    assert.equal(isProtectedPath("/zh/resume"), true);
    assert.equal(isProtectedPath("/en/resume"), true);
    assert.equal(isProtectedPath("/zh/resume/"), true);
  });

  it("matches agent and agent thread paths", () => {
    assert.equal(isProtectedPath("/agent"), true);
    assert.equal(isProtectedPath("/agent/thread-1"), true);
  });

  it("matches admin with and without locale prefix", () => {
    assert.equal(isProtectedPath("/admin"), true);
    assert.equal(isProtectedPath("/admin/users"), true);
    assert.equal(isProtectedPath("/zh/admin"), true);
    assert.equal(isProtectedPath("/zh/admin/users"), true);
  });

  it("does not match public or lookalike paths", () => {
    assert.equal(isProtectedPath("/"), false);
    assert.equal(isProtectedPath("/agency"), false);
    assert.equal(isProtectedPath("/zh"), false);
    assert.equal(isProtectedPath("/zh/home"), false);
  });
});

describe("getProtectedPage", () => {
  it("returns locale config for resume and not for agent", () => {
    assert.equal(getProtectedPage("/zh/resume")?.locale, true);
    assert.equal(getProtectedPage("/agent")?.locale, false);
    assert.equal(getProtectedPage("/admin")?.locale, true);
    assert.equal(getProtectedPage("/zh/admin")?.locale, true);
  });
});

describe("getSafeReturnTo", () => {
  it("keeps protected relative paths", () => {
    assert.equal(getSafeReturnTo("/resume"), "/resume");
    assert.equal(getSafeReturnTo("/zh/resume"), "/zh/resume");
    assert.equal(getSafeReturnTo("/agent/thread-1"), "/agent/thread-1");
    assert.equal(getSafeReturnTo("/admin"), "/admin");
    assert.equal(getSafeReturnTo("/admin/users"), "/admin/users");
    assert.equal(getSafeReturnTo("/zh/admin"), "/zh/admin");
    assert.equal(getSafeReturnTo("/zh/admin/users"), "/zh/admin/users");
  });

  it("rejects public, absolute, and protocol-relative values", () => {
    assert.equal(getSafeReturnTo("/"), "/");
    assert.equal(getSafeReturnTo("https://evil.test/resume"), "/");
    assert.equal(getSafeReturnTo("//evil.test/resume"), "/");
    assert.equal(getSafeReturnTo("/agency"), "/");
    assert.equal(getSafeReturnTo(undefined), "/");
  });
});

describe("getAuthorizationUrl", () => {
  it("points at /auth with a sanitized returnTo", () => {
    assert.equal(
      getAuthorizationUrl("/agent/thread-1"),
      "/auth?returnTo=%2Fagent%2Fthread-1",
    );
    assert.equal(
      getAuthorizationUrl("https://evil.test"),
      "/auth?returnTo=%2F",
    );
  });

  it("keeps the locale from a localized return path or an explicit locale", () => {
    assert.equal(
      getAuthorizationUrl("/zh/resume"),
      "/zh/auth?returnTo=%2Fzh%2Fresume",
    );
    assert.equal(
      getAuthorizationUrl("/zh/admin/users"),
      "/zh/auth?returnTo=%2Fzh%2Fadmin%2Fusers",
    );
    assert.equal(
      getAuthorizationUrl("/agent", "ja"),
      "/ja/auth?returnTo=%2Fagent",
    );
    assert.equal(
      getAuthorizationUrl("/resume", "en"),
      "/auth?returnTo=%2Fresume",
    );
    assert.equal(
      getAuthorizationUrl("https://evil.test", "zh"),
      "/zh/auth?returnTo=%2F",
    );
    assert.equal(
      getAuthorizationUrl("/agent", "nope"),
      "/auth?returnTo=%2Fagent",
    );
  });
});
