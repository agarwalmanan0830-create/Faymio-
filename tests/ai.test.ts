import { afterEach, describe, expect, it, vi } from "vitest";
import { extractBrief, parseDemoBrief } from "../src/lib/ai/brief";
import { answerOperation } from "../src/lib/ai/operations";
import type { Assignment, Campaign, Talent, Workspace } from "../src/types";

const now = new Date("2026-10-22T08:00:00.000Z");
const earlier = "2026-10-20T08:00:00.000Z";
const later = "2026-10-24T08:00:00.000Z";
const exampleBrief =
  "GlowLab Skincare is launching a new vitamin C serum. We need 20 beauty and lifestyle creators. Budget ₹2,00,000. Campaign duration 15 days. Each creator should publish one Instagram reel. Brand approval is required before publishing.";

function talent(id: string, fullName: string): Talent {
  return {
    id,
    fullName,
    category: "Influencer",
    email: `${id}@example.test`,
    phone: null,
    city: "Mumbai",
    links: "https://example.test/portfolio",
    contentCategory: "Beauty",
    languages: "English, Hindi",
    representation: "Demo agency",
    rateMinPaise: null,
    rateMaxPaise: null,
    availability: "AVAILABLE",
    notes: "",
    verified: false,
    createdAt: earlier,
    updatedAt: earlier,
  };
}

function assignment(
  id: string,
  name: string,
  options: {
    pending?: boolean;
    published?: boolean;
    payment?: "PAID" | "PENDING";
    followUp?: boolean;
  } = {},
): Assignment {
  const person = talent(`talent-${id}`, name);
  return {
    id,
    talentId: person.id,
    talent: person,
    task: "Instagram reel",
    dueDate: earlier,
    status: "CONFIRMED",
    deliverable: {
      id: `deliverable-${id}`,
      status: options.published
        ? "PUBLISHED"
        : options.pending
          ? "SUBMITTED"
          : "IN_PROGRESS",
      url:
        options.pending || options.published
          ? `https://example.test/${id}`
          : null,
    },
    approval: {
      id: `approval-${id}`,
      status: options.pending ? "PENDING" : "APPROVED",
    },
    payment: {
      id: `payment-${id}`,
      amountPaise: 1_000_000,
      status: options.payment || "PENDING",
      followUp: options.followUp || false,
    },
  };
}

function campaign(
  id: string,
  name: string,
  brand: string,
  assignments: Assignment[],
): Campaign {
  return {
    id,
    name,
    brandId: `brand-${id}`,
    brand: { name: brand },
    budgetPaise: 20_000_000,
    startDate: earlier,
    endDate: later,
    manager: "Demo manager",
    status: "ACTIVE",
    objective: "Product launch",
    requiredCategory: "Beauty",
    creatorCount: assignments.length,
    deliverableBrief: "One reel per creator",
    approvalRequired: true,
    assignments,
    tasks: [],
    createdAt: earlier,
    updatedAt: earlier,
  };
}

function workspace(): Workspace {
  const skincare = campaign(
    "glow-lab",
    "GlowLab Vitamin C Launch",
    "GlowLab Skincare",
    [
      assignment("pending-1", "Aanya Kapoor", {
        pending: true,
        followUp: true,
      }),
      assignment("pending-2", "Rohan Mehta", { pending: true }),
      assignment("published-1", "Isha Rao", {
        published: true,
        payment: "PAID",
        followUp: true,
      }),
    ],
  );
  skincare.tasks = [
    {
      id: "late-task",
      title: "Submit first reel cut",
      dueDate: earlier,
      status: "OPEN",
      assignmentId: "pending-1",
    },
    {
      id: "done-task",
      title: "Confirm usage rights",
      dueDate: earlier,
      status: "COMPLETED",
      assignmentId: "pending-2",
    },
    {
      id: "future-task",
      title: "Publish approved reel",
      dueDate: later,
      status: "OPEN",
      assignmentId: "published-1",
    },
  ];
  const outdoors = campaign(
    "trail",
    "Trail Outdoor Stories",
    "Trail Equipment",
    [
      assignment("other-pending", "Neel Shah", {
        pending: true,
        followUp: true,
      }),
    ],
  );
  return {
    organization: { id: "demo-org", name: "Demo agency" },
    user: { name: "Demo manager", email: "manager@example.test" },
    talent: [...skincare.assignments, ...outdoors.assignments].map(
      (a) => a.talent,
    ),
    campaigns: [skincare, outdoors],
    activity: [
      {
        id: "recent",
        message: "Submission received",
        campaignId: "glow-lab",
        createdAt: earlier,
      },
    ],
    aiMode: "demo",
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deterministic brief extraction", () => {
  it("extracts the supplied Indian campaign details without inventing the start date", () => {
    const result = parseDemoBrief(exampleBrief);
    expect(result.brandName).toBe("GlowLab Skincare");
    expect(result.budgetPaise).toBe(20_000_000);
    expect(result.creatorCount).toBe(20);
    expect(result.durationDays).toBe(15);
    expect(result.approvalRequired).toBe(true);
    expect(result.requiredCategory).toMatch(/beauty/i);
    expect(result.objective).toMatch(/vitamin C serum/i);
    expect(result.deliverables).toMatch(/one Instagram reel/i);
    expect(result.startDate).toBe("");
    expect(result.missingInformation).toContain("Campaign start date");
    expect(parseDemoBrief(exampleBrief)).toEqual(result);
  });

  it.each([
    ["₹2.5 lakh", 25_000_000],
    ["INR 50k", 5_000_000],
    ["₹1 crore", 1_000_000_000],
    ["₹12,345.67", 1_234_567],
  ])("converts %s to fixed-precision paise", (budget, expected) => {
    expect(
      parseDemoBrief(`Luma Beauty needs 5 creators. Budget ${budget}.`)
        .budgetPaise,
    ).toBe(expected);
  });

  it("recognizes explicitly waived approval and identifies absent requirements", () => {
    const result = parseDemoBrief(
      "Mira Foods needs creators. No brand approval is required.",
    );
    expect(result.approvalRequired).toBe(false);
    expect(result.creatorCount).toBe(0);
    expect(result.missingInformation).toContain("Number of creators");
    expect(result.missingInformation).toContain("Confirmed campaign budget");
    expect(result.missingInformation).toContain("Campaign duration");
    expect(result.missingInformation).toContain("Deliverable specifications");
  });

  it("uses labeled deterministic mode without making a provider request when no key exists", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);
    const result = await extractBrief(exampleBrief);
    expect(result.mode).toBe("demo");
    expect(result.brief).toEqual(parseDemoBrief(exampleBrief));
    expect(provider).not.toHaveBeenCalled();
  });

  it("falls back transparently when the provider returns invalid structured output", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [
              { message: { content: '{"budgetPaise":"not a number"}' } },
            ],
          }),
        }),
    );
    const result = await extractBrief(exampleBrief);
    expect(result.mode).toBe("demo");
    expect(result.notice).toMatch(/validated result|demo parsing/i);
    expect(result.brief).toEqual(parseDemoBrief(exampleBrief));
  });
});

describe("database-grounded operations answers", () => {
  it("lists only stored pending approvals and preserves their campaign references", () => {
    const result = answerOperation(
      "Show pending approvals",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("approvals");
    expect(result.mode).toBe("demo");
    expect(result.records.map((r) => r.id).sort()).toEqual([
      "other-pending",
      "pending-1",
      "pending-2",
    ]);
    expect(result.campaigns.map((c) => c.id).sort()).toEqual([
      "glow-lab",
      "trail",
    ]);
    expect(result.text).toMatch(/3 content approvals/);
  });

  it("scopes a named campaign and reflects a subsequent stored approval change", () => {
    const state = workspace();
    expect(
      answerOperation(
        "Show GlowLab pending approvals",
        state,
        undefined,
        now,
      ).records.map((r) => r.id),
    ).toEqual(["pending-1", "pending-2"]);
    state.campaigns[0].assignments[0].approval!.status = "APPROVED";
    const result = answerOperation(
      "Show GlowLab pending approvals",
      state,
      undefined,
      now,
    );
    expect(result.records.map((r) => r.id)).toEqual(["pending-2"]);
    expect(result.campaigns).toEqual([
      { id: "glow-lab", name: "GlowLab Vitamin C Launch" },
    ]);
  });

  it("excludes paid records even if a stale payment follow-up flag exists", () => {
    const result = answerOperation(
      "Which payments need follow-up?",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("payments");
    expect(result.records.map((r) => r.id).sort()).toEqual([
      "other-pending",
      "pending-1",
    ]);
    expect(result.records.some((r) => r.name === "Isha Rao")).toBe(false);
  });

  it("identifies overdue open tasks without treating old completed tasks as late", () => {
    const result = answerOperation(
      "Which creators are delaying the skincare campaign?",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("overdue");
    expect(result.records.map((r) => r.id)).toEqual(["late-task"]);
    expect(result.records[0].name).toBe("Aanya Kapoor");
    expect(result.records[0].campaignId).toBe("glow-lab");
  });

  it("prepares reviewable reminders solely for overdue work", () => {
    const result = answerOperation(
      "Draft reminders for overdue creators",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("reminders");
    expect(result.records).toHaveLength(1);
    expect(result.draft).toContain("Hi Aanya");
    expect(result.draft).toContain("GlowLab Vitamin C Launch");
    expect(result.draft).not.toContain("Rohan");
    expect(result.text).toMatch(/nothing has been sent/i);
  });

  it("counts only published deliverables as completed in a scoped progress summary", () => {
    const result = answerOperation(
      "Prepare a summary for the GlowLab brand",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("summary");
    expect(result.text).toContain("3 of 3 assignments are confirmed");
    expect(result.text).toMatch(/1 deliverable(?:s)? (?:is|are) published/);
    expect(result.text).toContain("2 approvals are pending");
    expect(result.records.map((r) => r.id)).toEqual(["glow-lab"]);
    expect(result.draft).toBeDefined();
  });

  it("does not silently answer an unknown named campaign with workspace-wide records", () => {
    const result = answerOperation(
      "Show pending approvals for UnknownBrand",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("unsupported");
    expect(result.records).toEqual([]);
    expect(result.text).toMatch(/couldn.t match/i);
  });

  it("states the limits of unsupported requests without returning fabricated records", () => {
    const result = answerOperation(
      "Predict which creator will become famous and negotiate a contract",
      workspace(),
      undefined,
      now,
    );
    expect(result.operation).toBe("unsupported");
    expect(result.records).toEqual([]);
    expect(result.campaigns).toEqual([]);
    expect(result.text).toMatch(/cannot answer.*available records/i);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
