import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, assertSameOrigin } from "../src/server/context";

function request(origin: string | undefined, extra: Record<string, string> = {}) {
  return new Request("http://0.0.0.0:3001/api/talent", {
    method: "POST",
    headers: {
      host: "127.0.0.1:3001",
      ...(origin === undefined ? {} : { origin }),
      ...extra,
    },
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("mutation origin validation", () => {
  it("accepts the browser-facing Host when Next normalizes its URL to the bind address", () => {
    vi.stubEnv("APP_ORIGIN", "");
    expect(() => assertSameOrigin(request("http://127.0.0.1:3001"))).not.toThrow();
  });

  it("rejects foreign origins even when they match the internal bind address", () => {
    vi.stubEnv("APP_ORIGIN", "");
    for (const origin of ["http://malicious.example", "http://0.0.0.0:3001", "https://127.0.0.1:3001", "http://127.0.0.1:3002"]) {
      expect(() => assertSameOrigin(request(origin))).toThrow(/Cross-origin/);
    }
  });

  it("does not use attacker-supplied forwarded host or protocol headers", () => {
    vi.stubEnv("APP_ORIGIN", "");
    expect(() => assertSameOrigin(request("https://malicious.example", {
      "x-forwarded-host": "malicious.example",
      "x-forwarded-proto": "https",
    }))).toThrow(/Cross-origin/);
  });

  it.each(["", "null", "invalid", "javascript:alert(1)", "https://valid.example/path", "https://valid.example?x=1", "https://valid.example#fragment", "https://user:secret@valid.example", "https://first.example, https://second.example"])("rejects malformed or opaque origin %s", (origin) => {
    vi.stubEnv("APP_ORIGIN", "");
    expect(() => assertSameOrigin(request(origin))).toThrow(AppError);
    try { assertSameOrigin(request(origin)); } catch (error) {
      expect(error).toMatchObject({ status: 403, message: "Request origin is invalid." });
    }
  });

  it("uses explicit APP_ORIGIN for a trusted reverse-proxy public address", () => {
    vi.stubEnv("APP_ORIGIN", "https://demo.faymio.example");
    expect(() => assertSameOrigin(request("https://demo.faymio.example"))).not.toThrow();
    expect(() => assertSameOrigin(request("http://127.0.0.1:3001"))).toThrow(/Cross-origin/);
  });

  it("rejects malformed Host headers instead of interpreting them as URLs", () => {
    vi.stubEnv("APP_ORIGIN", "");
    expect(() => assertSameOrigin(request("http://malicious.example", {host:"malicious.example/path"}))).toThrow(/host is invalid/);
  });

  it("allows non-browser requests without Origin and falls back to the URL when Host is absent", () => {
    vi.stubEnv("APP_ORIGIN", "");
    expect(() => assertSameOrigin(request(undefined))).not.toThrow();
    expect(() => assertSameOrigin(new Request("http://localhost:3001/api/talent", {method:"POST",headers:{origin:"http://localhost:3001"}}))).not.toThrow();
  });
});
