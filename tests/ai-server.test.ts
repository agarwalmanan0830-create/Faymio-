import { afterEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "../src/types";
vi.mock("../src/server/context", () => ({
  AppError: class extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
}));
import { enforceRateLimit, respondToOperation } from "../src/lib/ai/server";
import { extractBrief } from "../src/lib/ai/brief";
const workspace: Workspace = {
  organization: { id: "unit-demo", name: "Demo workspace" },
  user: { name: "Demo manager", email: "demo@example.test" },
  talent: [],
  campaigns: [],
  activity: [],
  aiMode: "demo",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("server AI adapter safeguards", () => {
  it("limits requests per organization and resets the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T10:00:00.000Z"));
    for (let i = 0; i < 20; i++)
      expect(() => enforceRateLimit("rate-limit-org")).not.toThrow();
    expect(() => enforceRateLimit("rate-limit-org")).toThrow(/20 AI requests/);
    expect(() => enforceRateLimit("different-org")).not.toThrow();
    vi.advanceTimersByTime(60001);
    expect(() => enforceRateLimit("rate-limit-org")).not.toThrow();
  });
  it("keeps known operational questions deterministic even when a live key exists", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-only");
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);
    const answer = await respondToOperation(
      "Show pending approvals",
      workspace,
    );
    expect(provider).not.toHaveBeenCalled();
    expect(answer.operation).toBe("approvals");
    expect(answer.records).toEqual([]);
    expect(answer.text).toMatch(/no pending content approvals/i);
  });
  it("accepts only a validated read operation from a live router and computes facts locally", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '{"operation":"summary"}' } }],
          }),
        }),
    );
    const answer = await respondToOperation(
      "Give me an overview of everything underway",
      workspace,
    );
    expect(answer.mode).toBe("live");
    expect(answer.operation).toBe("summary");
    expect(answer.text).toContain("0 campaigns");
    expect(answer.records).toEqual([]);
  });
  it("rejects model-proposed mutations and returns a transparent read-only fallback", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [
              { message: { content: '{"operation":"execute_payment"}' } },
            ],
          }),
        }),
    );
    const answer = await respondToOperation(
      "Do something special with our commercial workflow",
      workspace,
    );
    expect(answer.mode).toBe("demo");
    expect(answer.operation).toBe("unsupported");
    expect(answer.notice).toMatch(/unavailable/i);
    expect(answer.records).toEqual([]);
  });
  it("recovers from a brief-provider timeout without inventing a live result", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-only");
    const provider = vi
      .fn()
      .mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    vi.stubGlobal("fetch", provider);
    const answer = await extractBrief(
      "Luma Beauty needs 5 creators. Budget ₹50,000. Duration 10 days.",
    );
    expect(provider).toHaveBeenCalledTimes(1);
    expect(answer.mode).toBe("demo");
    expect(answer.notice).toMatch(/deterministic demo parsing/i);
    expect(answer.brief.budgetPaise).toBe(5_000_000);
    const call = provider.mock.calls[0] as unknown as [
      string,
      { signal: AbortSignal },
    ];
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });
});
