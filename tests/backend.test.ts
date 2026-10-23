import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { metrics } from "../src/lib/metrics";
import { answerOperation } from "../src/lib/ai/operations";
import { parseDemoBrief } from "../src/lib/ai/brief";

// These tests use a disposable database, never the developer's demonstration DB.
const project = resolve(__dirname, "..");
const directory = mkdtempSync(join(tmpdir(), "faymio-integration-"));
const databaseUrl = `file:${join(directory, "test.db")}`;
const oldDatabaseUrl = process.env.DATABASE_URL;
const oldDemoMode = process.env.DEMO_MODE;
let db: PrismaClient;
let services: typeof import("../src/server/services");
let getWorkspace: typeof import("../src/server/workspace").getWorkspace;
let seedDemo: typeof import("../prisma/demo-data").seedDemo;
let serial = 0;
const future = () => new Date(Date.now() + 7 * 86_400_000).toISOString();
const past = () => new Date(Date.now() - 2 * 86_400_000).toISOString();

async function applyMigrations() {
  // Run the checked-in SQL through the same Prisma connection. No subprocess is
  // needed, so this also works in restricted CI workers that prohibit spawning.
  const migrations = join(project, "prisma", "migrations");
  for (const name of readdirSync(migrations)
    .filter((n) => /^\d/.test(n))
    .sort()) {
    const sql = readFileSync(join(migrations, name, "migration.sql"), "utf8");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await db.$executeRawUnsafe(statement);
    }
  }
}

async function newTalent(extra: Record<string, unknown> = {}) {
  serial += 1;
  return services.createTalent({
    fullName: `Integration Creator ${serial}`,
    category: "UGC creator",
    email: `creator-${serial}@integration.example`,
    city: "Mumbai",
    ...extra,
  });
}

async function newCampaign(extra: Record<string, unknown> = {}) {
  serial += 1;
  return services.createCampaign({
    name: `Integration Campaign ${serial}`,
    brandName: "Integration Demo Brand",
    budgetPaise: 1_000_000,
    startDate: new Date().toISOString(),
    endDate: future(),
    approvalRequired: true,
    ...extra,
  });
}

async function newAssignment(approvalRequired = true) {
  const talent = await newTalent();
  const campaign = await newCampaign({ approvalRequired });
  const assignment = await services.assignTalent(campaign.id, {
    talentId: talent.id,
    task: "Create one reviewed reel",
    dueDate: future(),
  });
  return { talent, campaign, assignment };
}

async function assignmentState(id: string) {
  return db.campaignAssignment.findUniqueOrThrow({
    where: { id },
    include: { deliverable: true, approval: true, payment: true },
  });
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DEMO_MODE = "true";
  writeFileSync(join(directory, "test.db"), "");
  db = (await import("../src/lib/db")).db;
  await applyMigrations();
  seedDemo = (await import("../prisma/demo-data")).seedDemo;
  await seedDemo(db);
  services = await import("../src/server/services");
  getWorkspace = (await import("../src/server/workspace")).getWorkspace;
});

afterAll(async () => {
  if (db) await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
  if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = oldDatabaseUrl;
  if (oldDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = oldDemoMode;
});

describe("persisted demonstration data", () => {
  it("derives the exact GlowLab demonstration metrics from relational records", async () => {
    const workspace = await getWorkspace();
    const campaign = workspace.campaigns.find((c) => c.id === "glow-lab");
    expect(campaign).toBeDefined();
    expect(campaign!.budgetPaise).toBe(20_000_000);
    expect(
      new Date(campaign!.endDate).getTime() -
        new Date(campaign!.startDate).getTime(),
    ).toBe(15 * 86_400_000);
    expect(metrics([campaign!])).toEqual({
      active: 1,
      assigned: 20,
      confirmed: 16,
      completed: 11,
      approvals: 4,
      overdue: 2,
      payments: 3,
      total: 20,
    });
    expect(
      campaign!.assignments.filter((a) => a.status === "INVITED"),
    ).toHaveLength(4);
    expect(
      campaign!.assignments.filter(
        (a) =>
          a.status === "CONFIRMED" && a.deliverable?.status === "PUBLISHED",
      ),
    ).toHaveLength(11);
    expect(
      campaign!.assignments.filter(
        (a) =>
          a.status === "CONFIRMED" &&
          a.deliverable?.status === "SUBMITTED" &&
          a.approval?.status === "PENDING",
      ),
    ).toHaveLength(4);
    expect(
      campaign!.assignments.filter(
        (a) =>
          a.status === "CONFIRMED" && a.deliverable?.status === "IN_PROGRESS",
      ),
    ).toHaveLength(1);
    expect(workspace.talent.every((t) => !t.verified)).toBe(true);
    expect(
      await db.organization.findUniqueOrThrow({ where: { id: "demo-org" } }),
    ).toMatchObject({ isDemo: true });
  });

  it("grounds pending-approval answers in the stored workspace", async () => {
    const workspace = await getWorkspace();
    const answer = answerOperation("Show GlowLab pending approvals", workspace);
    expect(answer.operation).toBe("approvals");
    expect(answer.records.map((r) => r.id).sort()).toEqual([
      "glow-assignment-12",
      "glow-assignment-13",
      "glow-assignment-14",
      "glow-assignment-15",
    ]);
    expect(answer.campaigns).toEqual([
      { id: "glow-lab", name: "GlowLab Vitamin C Launch" },
    ]);
  });

  it("preserves saved changes when the seed script is rerun", async () => {
    const talent = await newTalent({ fullName: "Saved Before Reseed" });
    const count = await db.talent.count();
    await seedDemo(db);
    expect(await db.talent.count()).toBe(count);
    expect(
      await db.talent.findUniqueOrThrow({ where: { id: talent.id } }),
    ).toMatchObject({ fullName: "Saved Before Reseed" });
    expect(
      await db.campaignAssignment.count({ where: { campaignId: "glow-lab" } }),
    ).toBe(20);
  });
});

describe("talent and campaign persistence", () => {
  it("creates, edits, searches, and archives talent while retaining assigned history", async () => {
    const talent = await newTalent({
      fullName: "Searchable Fictional Creator",
      organizationId: "untrusted-browser-org",
    });
    expect(talent.organizationId).toBe("demo-org");
    expect(talent.verified).toBe(false);
    await services.updateTalent(talent.id, {
      fullName: "Updated Searchable Creator",
      city: "Pune",
      verified: true,
    });
    const workspace = await getWorkspace();
    expect(
      workspace.talent.filter((t) => t.fullName.includes("Updated Searchable")),
    ).toEqual([
      expect.objectContaining({ id: talent.id, city: "Pune", verified: true }),
    ]);
    const campaign = await newCampaign();
    const assignment = await services.assignTalent(campaign.id, {
      talentId: talent.id,
      task: "Archive history check",
      dueDate: future(),
    });
    await services.deleteTalent(talent.id);
    expect((await getWorkspace()).talent.some((t) => t.id === talent.id)).toBe(
      false,
    );
    expect(
      (await db.talent.findUniqueOrThrow({ where: { id: talent.id } }))
        .deletedAt,
    ).toBeInstanceOf(Date);
    expect(await assignmentState(assignment.id)).toMatchObject({
      talentId: talent.id,
    });
    expect(
      await db.activityLog.count({
        where: { message: { contains: "manually marked verified" } },
      }),
    ).toBeGreaterThan(0);
    await expect(
      services.updateTalent(talent.id, { city: "Delhi" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("creates a campaign using reviewed edits to an extracted brief", async () => {
    const brief = parseDemoBrief(
      "GlowLab Skincare is launching a vitamin C serum. We need 20 beauty creators. Budget ₹2,00,000. Campaign duration 15 days. Each creator should publish one Instagram reel. Brand approval is required.",
    );
    const campaign = await services.createCampaign({
      brandName: brief.brandName,
      name: "Reviewed GlowLab Pilot",
      budgetPaise: 18_000_000,
      startDate: new Date().toISOString(),
      endDate: future(),
      objective: brief.objective,
      requiredCategory: brief.requiredCategory,
      creatorCount: 12,
      deliverableBrief: brief.deliverables,
      approvalRequired: brief.approvalRequired,
    });
    const saved = (await getWorkspace()).campaigns.find(
      (c) => c.id === campaign.id,
    );
    expect(saved).toMatchObject({
      name: "Reviewed GlowLab Pilot",
      budgetPaise: 18_000_000,
      creatorCount: 12,
      brand: { name: "GlowLab Skincare" },
    });
    await expect(newCampaign({ budgetPaise: 10.5 })).rejects.toThrow();
    await expect(newCampaign({ endDate: past() })).rejects.toThrow();
  });

  it("persists assignments and rejects duplicate or archived talent assignments", async () => {
    const { campaign, talent, assignment } = await newAssignment();
    expect(
      (await getWorkspace()).campaigns.find((c) => c.id === campaign.id)
        ?.assignments,
    ).toEqual([
      expect.objectContaining({
        id: assignment.id,
        talentId: talent.id,
        status: "INVITED",
      }),
    ]);
    await expect(
      services.assignTalent(campaign.id, {
        talentId: talent.id,
        task: "Duplicate",
        dueDate: future(),
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(
      await db.campaignAssignment.count({ where: { campaignId: campaign.id } }),
    ).toBe(1);
    await services.deleteTalent(talent.id);
    const otherCampaign = await newCampaign();
    await expect(
      services.assignTalent(otherCampaign.id, {
        talentId: talent.id,
        task: "Archived creator",
        dueDate: future(),
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("execution transitions, approval, and payment records", () => {
  it("requires confirmation and URL, then supports changes, resubmission, approval, and publication", async () => {
    const { campaign, assignment } = await newAssignment();
    const countBefore = await db.activityLog.count();
    await expect(
      services.updateAssignment(assignment.id, {
        deliverableStatus: "SUBMITTED",
        url: "https://example.com/reel/one",
      }),
    ).rejects.toThrow(/Confirm talent/);
    expect(await db.activityLog.count()).toBe(countBefore);
    expect((await assignmentState(assignment.id)).deliverable?.status).toBe(
      "NOT_STARTED",
    );
    await services.updateAssignment(assignment.id, { status: "CONFIRMED" });
    await expect(
      services.updateAssignment(assignment.id, {
        deliverableStatus: "SUBMITTED",
      }),
    ).rejects.toThrow(/URL/);
    await expect(
      services.updateAssignment(assignment.id, {
        deliverableStatus: "SUBMITTED",
        url: "javascript:alert(1)",
      }),
    ).rejects.toThrow();
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "IN_PROGRESS",
    });
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "SUBMITTED",
      url: "https://example.com/reel/one",
    });
    expect(await assignmentState(assignment.id)).toMatchObject({
      deliverable: { status: "SUBMITTED" },
      approval: { status: "PENDING" },
    });
    await expect(
      services.updateAssignment(assignment.id, {
        deliverableStatus: "PUBLISHED",
      }),
    ).rejects.toThrow();
    await expect(
      services.updateAssignment(assignment.id, { status: "CANCELLED" }),
    ).rejects.toThrow();
    await services.updateAssignment(assignment.id, {
      approvalStatus: "CHANGES_REQUESTED",
    });
    expect(await assignmentState(assignment.id)).toMatchObject({
      deliverable: { status: "IN_PROGRESS" },
      approval: { status: "CHANGES_REQUESTED" },
    });
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "SUBMITTED",
      url: "https://example.com/reel/revised",
    });
    const workspaceBeforeApproval = await getWorkspace();
    expect(
      answerOperation("Show pending approvals", {
        ...workspaceBeforeApproval,
        campaigns: workspaceBeforeApproval.campaigns.filter(
          (c) => c.id === campaign.id,
        ),
      }).records.map((r) => r.id),
    ).toEqual([assignment.id]);
    await services.updateAssignment(assignment.id, {
      approvalStatus: "APPROVED",
    });
    expect(await assignmentState(assignment.id)).toMatchObject({
      deliverable: { status: "APPROVED" },
      approval: { status: "APPROVED" },
    });
    const approvedCampaign = (await getWorkspace()).campaigns.find(
      (c) => c.id === campaign.id,
    )!;
    expect(metrics([approvedCampaign]).completed).toBe(0);
    expect(metrics([approvedCampaign]).approvals).toBe(0);
    await expect(
      services.updateAssignment(assignment.id, {
        url: "https://example.com/reel/unreviewed",
      }),
    ).rejects.toThrow(/locked/);
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "PUBLISHED",
    });
    const publishedCampaign = (await getWorkspace()).campaigns.find(
      (c) => c.id === campaign.id,
    )!;
    expect(metrics([publishedCampaign]).completed).toBe(1);
    const workspaceAfterPublication = await getWorkspace();
    expect(
      answerOperation("Show pending approvals", {
        ...workspaceAfterPublication,
        campaigns: workspaceAfterPublication.campaigns.filter(
          (c) => c.id === campaign.id,
        ),
      }).records,
    ).toEqual([]);
    const finalAuditCount = await db.activityLog.count();
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "PUBLISHED",
    });
    expect(await db.activityLog.count()).toBe(finalAuditCount);
    await expect(
      services.updateAssignment(assignment.id, {
        deliverableStatus: "IN_PROGRESS",
      }),
    ).rejects.toThrow();
    expect(await db.activityLog.count()).toBe(finalAuditCount);
  });

  it("publishes submitted work directly when content approval is explicitly not required", async () => {
    const { assignment } = await newAssignment(false);
    await services.updateAssignment(assignment.id, { status: "CONFIRMED" });
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "SUBMITTED",
      url: "https://example.com/reel/no-review",
    });
    await expect(
      services.updateAssignment(assignment.id, { approvalStatus: "APPROVED" }),
    ).rejects.toThrow(/does not require/);
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "PUBLISHED",
    });
    expect(await assignmentState(assignment.id)).toMatchObject({
      deliverable: { status: "PUBLISHED" },
      approval: { status: "NOT_REQUIRED" },
    });
  });

  it("records fixed-precision invoices and clears follow-up when marked paid", async () => {
    const { campaign, assignment } = await newAssignment();
    await expect(
      services.updateAssignment(assignment.id, { paymentStatus: "PAID" }),
    ).rejects.toThrow(/invoice amount/);
    await services.updateAssignment(assignment.id, {
      amountPaise: 1_234_567,
      paymentStatus: "PENDING",
      followUp: true,
    });
    expect(await assignmentState(assignment.id)).toMatchObject({
      payment: { amountPaise: 1_234_567, status: "PENDING", followUp: true },
    });
    expect(
      metrics([
        (await getWorkspace()).campaigns.find((c) => c.id === campaign.id)!,
      ]).payments,
    ).toBe(1);
    await expect(
      services.updateAssignment(assignment.id, {
        paymentStatus: "PAID",
        followUp: true,
      }),
    ).rejects.toThrow(/Paid invoices/);
    await services.updateAssignment(assignment.id, { paymentStatus: "PAID" });
    expect(await assignmentState(assignment.id)).toMatchObject({
      payment: { status: "PAID", followUp: false },
    });
    expect(
      metrics([
        (await getWorkspace()).campaigns.find((c) => c.id === campaign.id)!,
      ]).payments,
    ).toBe(0);
    await expect(
      services.updateAssignment(assignment.id, { amountPaise: -1 }),
    ).rejects.toThrow();
    await expect(
      services.updateAssignment(assignment.id, { amountPaise: 12.34 }),
    ).rejects.toThrow();
  });

  it("adds overdue operational tasks to the persisted action queue and removes completed work", async () => {
    const { campaign, assignment } = await newAssignment();
    const task = await services.createTask(campaign.id, {
      title: "Collect the overdue first cut",
      dueDate: past(),
      assignmentId: assignment.id,
    });
    let workspace = await getWorkspace();
    expect(
      metrics([workspace.campaigns.find((c) => c.id === campaign.id)!]).overdue,
    ).toBe(1);
    expect(
      answerOperation("Show overdue tasks", {
        ...workspace,
        campaigns: workspace.campaigns.filter((c) => c.id === campaign.id),
      }).records.map((r) => r.id),
    ).toEqual([task.id]);
    await services.updateTask(task.id, "COMPLETED");
    workspace = await getWorkspace();
    expect(
      metrics([workspace.campaigns.find((c) => c.id === campaign.id)!]).overdue,
    ).toBe(0);
    expect(
      answerOperation("Show overdue tasks", {
        ...workspace,
        campaigns: workspace.campaigns.filter((c) => c.id === campaign.id),
      }).records,
    ).toEqual([]);
  });
});

describe("organization ownership and safe export", () => {
  it("blocks manipulated IDs and nested relation IDs without disclosing or changing foreign data", async () => {
    const otherOrganization = await db.organization.create({
      data: { name: "Foreign Test Organization" },
    });
    const foreignTalent = await db.talent.create({
      data: {
        organizationId: otherOrganization.id,
        fullName: "Foreign Private Creator",
        category: "Actor",
        email: "private@example.test",
        city: "Delhi",
      },
    });
    const foreignBrand = await db.brand.create({
      data: {
        organizationId: otherOrganization.id,
        name: "Foreign Private Brand",
      },
    });
    const foreignCampaign = await db.campaign.create({
      data: {
        organizationId: otherOrganization.id,
        brandId: foreignBrand.id,
        name: "Foreign Private Campaign",
        budgetPaise: 100,
        startDate: new Date(),
        endDate: new Date(future()),
        manager: "Foreign Manager",
      },
    });
    const foreignAssignment = await db.campaignAssignment.create({
      data: {
        organizationId: otherOrganization.id,
        campaignId: foreignCampaign.id,
        talentId: foreignTalent.id,
        task: "Foreign work",
        dueDate: new Date(future()),
      },
    });
    const foreignTask = await db.task.create({
      data: {
        organizationId: otherOrganization.id,
        campaignId: foreignCampaign.id,
        assignmentId: foreignAssignment.id,
        title: "Foreign task",
        dueDate: new Date(past()),
      },
    });
    const ownCampaign = await newCampaign();
    const activityCount = await db.activityLog.count();
    await expect(
      services.updateTalent(foreignTalent.id, { fullName: "Leaked edit" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(services.deleteTalent(foreignTalent.id)).rejects.toMatchObject(
      { status: 404 },
    );
    await expect(
      services.updateCampaign(foreignCampaign.id, { name: "Leaked edit" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.deleteCampaign(foreignCampaign.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.exportCampaign(foreignCampaign.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.addNote(foreignCampaign.id, "Leaked note"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.assignTalent(ownCampaign.id, {
        talentId: foreignTalent.id,
        task: "Nested foreign creator",
        dueDate: future(),
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.updateAssignment(foreignAssignment.id, { status: "CONFIRMED" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.createTask(ownCampaign.id, {
        title: "Nested foreign assignment",
        dueDate: future(),
        assignmentId: foreignAssignment.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      services.updateTask(foreignTask.id, "COMPLETED"),
    ).rejects.toMatchObject({ status: 404 });
    expect(await db.activityLog.count()).toBe(activityCount);
    expect(
      await db.talent.findUniqueOrThrow({ where: { id: foreignTalent.id } }),
    ).toMatchObject({ fullName: "Foreign Private Creator", deletedAt: null });
    expect(
      await db.campaignAssignment.findUniqueOrThrow({
        where: { id: foreignAssignment.id },
      }),
    ).toMatchObject({ status: "INVITED" });
    expect(
      await db.task.findUniqueOrThrow({ where: { id: foreignTask.id } }),
    ).toMatchObject({ status: "OPEN" });
    const workspace = await getWorkspace();
    expect(workspace.talent.some((t) => t.id === foreignTalent.id)).toBe(false);
    expect(workspace.campaigns.some((c) => c.id === foreignCampaign.id)).toBe(
      false,
    );
    expect(
      answerOperation("Show overdue tasks", workspace).records.some(
        (r) => r.id === foreignTask.id,
      ),
    ).toBe(false);
  });

  it("rejects task links to a different campaign in the same organization", async () => {
    const { assignment } = await newAssignment();
    const otherCampaign = await newCampaign();
    await expect(
      services.createTask(otherCampaign.id, {
        title: "Wrong campaign link",
        dueDate: future(),
        assignmentId: assignment.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("refuses workspace access when explicit demonstration mode is disabled", async () => {
    process.env.DEMO_MODE = "false";
    try {
      await expect(getWorkspace()).rejects.toMatchObject({ status: 403 });
    } finally {
      process.env.DEMO_MODE = "true";
    }
  });

  it("quotes CSV fields, retains rupee amounts as paise, and neutralizes spreadsheet formulas", async () => {
    const talent = await newTalent({
      fullName: '=HYPERLINK("https://example.com")',
    });
    const campaign = await newCampaign();
    const assignment = await services.assignTalent(campaign.id, {
      talentId: talent.id,
      task: "Reel, caption\nand disclosure",
      dueDate: future(),
    });
    await services.updateAssignment(assignment.id, { amountPaise: 987_654 });
    const csv = await services.exportCampaign(campaign.id);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"Reel, caption\nand disclosure"');
    expect(csv).toContain('"987654"');
    expect(csv).not.toContain("Foreign Private Creator");
    expect(services.csvCell("@SUM(A1:A2)")).toBe('"\'@SUM(A1:A2)"');
    expect(services.csvCell("  =SUM(A1:A2)")).toBe('"\'  =SUM(A1:A2)"');
  });
});
