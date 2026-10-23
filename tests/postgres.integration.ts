import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { metrics } from "../src/lib/metrics";
import { assertPortAvailable, waitForWorkspace } from "../scripts/demo.mjs";
import { redactOutput } from "../scripts/vercel-build.mjs";

function log(message: string) {
  console.log(message);
  mkdirSync("work", { recursive: true });
  appendFileSync("work/postgres-integration.log", `${message}\n`);
}

async function buildAndSmoke(
  expectedCampaignId: string,
  expectedCampaignCount: number,
) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Keep migrations on the same guarded local database even if the shell
    // also contains connection aliases for a hosted development database.
    DIRECT_URL: process.env.DATABASE_URL,
    DEMO_MODE: "true",
    ALLOW_DEMO_IN_PRODUCTION: "true",
    NODE_ENV: "production",
  };
  log(
    "POSTGRES: running the complete npm run vercel-build against the disposable database",
  );
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "vercel-build"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", () =>
      reject(new Error("Vercel build could not start.")),
    );
    child.once("exit", (code) => {
      const safe = redactOutput(output, env);
      writeFileSync("work/postgres-build.log", safe);
      console.log(safe);
      if (code === 0) resolve();
      else reject(new Error("Vercel build returned a nonzero exit status."));
    });
  });
  log(
    "POSTGRES PASS: full guarded Vercel build, repeatable migrations and seed",
  );

  await assertPortAvailable(3011);
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3011",
    ],
    {
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += chunk;
  });
  server.stderr.on("data", (chunk) => {
    serverLog += chunk;
  });
  const completion = new Promise<void>((resolve) =>
    server.once("exit", () => resolve()),
  );
  const readiness = new AbortController();
  const readinessOptions = { signal: readiness.signal, timeoutMs: 120_000 };
  try {
    await Promise.race([
      waitForWorkspace("http://127.0.0.1:3011/api/workspace", readinessOptions),
      completion.then(() => {
        throw new Error(
          "PostgreSQL production server exited before readiness.",
        );
      }),
    ]);
    const response = await fetch("http://127.0.0.1:3011/api/workspace");
    assert.equal(response.status, 200);
    const workspace = await response.json();
    assert.equal(workspace.talent.length, 24);
    assert.equal(workspace.campaigns.length, expectedCampaignCount);
    assert.ok(
      workspace.campaigns.some(
        (campaign: { id: string }) => campaign.id === expectedCampaignId,
      ),
    );
    assert.equal(
      workspace.campaigns.find(
        (campaign: { id: string }) => campaign.id === "glow-lab",
      ).assignments.length,
      20,
    );
    for (const route of [
      "/dashboard",
      "/talent",
      "/briefs",
      "/campaigns/glow-lab",
      "/assistant",
      "/campaigns",
      "/activity",
      "/settings",
    ]) {
      assert.equal((await fetch(`http://127.0.0.1:3011${route}`)).status, 200);
    }
    const headers = {
      "Content-Type": "application/json",
      Origin: "http://127.0.0.1:3011",
    };
    const created = await fetch("http://127.0.0.1:3011/api/talent", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "PostgreSQL HTTP Fictional Creator",
        category: "UGC creator",
        email: "postgres.http.qa@creator.example",
        city: "Mumbai",
      }),
    });
    assert.equal(created.status, 201);
    const talent = await created.json();
    assert.equal(
      (
        await fetch(`http://127.0.0.1:3011/api/talent/${talent.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ city: "Pune" }),
        })
      ).status,
      200,
    );
    const persisted = await (
      await fetch("http://127.0.0.1:3011/api/workspace")
    ).json();
    assert.equal(
      persisted.talent.find((person: { id: string }) => person.id === talent.id)
        .city,
      "Pune",
    );
    assert.equal(
      (
        await fetch(`http://127.0.0.1:3011/api/talent/${talent.id}`, {
          method: "DELETE",
          headers,
        })
      ).status,
      200,
    );
    log(
      "POSTGRES PASS: production workspace API, all eight application routes, and HTTP talent create/edit/reload/archive",
    );
  } finally {
    readiness.abort();
    if (server.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        /* Already exited. */
      }
      await Promise.race([completion, delay(5000)]);
      if (server.exitCode === null) {
        try {
          process.kill(-server.pid, "SIGKILL");
        } catch {
          /* Already exited. */
        }
      }
    }
    writeFileSync("work/postgres-runtime.log", redactOutput(serverLog, env));
  }
}

// Explicitly limited to the disposable local PostgreSQL QA container. This script
// must never be pointed at a hosted database or a real customer's workspace.
async function main() {
  const url = new URL(process.env.DATABASE_URL || "invalid:");
  assert.equal(
    process.env.FAYMIO_POSTGRES_TEST,
    "true",
    "Enable the isolated PostgreSQL test explicitly.",
  );
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "5433");
  assert.equal(url.pathname, "/faymio_test");

  const { db } = await import("../src/lib/db");
  const services = await import("../src/server/services");
  const { getWorkspace } = await import("../src/server/workspace");
  const { seedDemo } = await import("../prisma/demo-data");
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
  let expectedCampaignId = "";
  let expectedCampaignCount = 0;
  try {
    await seedDemo(db);
    const initial = await getWorkspace();
    const glow = initial.campaigns.find(
      (campaign) => campaign.id === "glow-lab",
    );
    assert.ok(glow);
    assert.equal(glow.budgetPaise, 20_000_000);
    assert.deepEqual(metrics([glow]), {
      active: 1,
      assigned: 20,
      confirmed: 16,
      completed: 11,
      approvals: 4,
      overdue: 2,
      payments: 3,
      total: 20,
    });
    log(
      "POSTGRES PASS: exact persisted GlowLab seed metrics (20 assigned / 16 confirmed / 11 published / 4 approvals / 2 overdue / 3 payment follow-ups)",
    );

    const talent = await services.createTalent({
      fullName: "PostgreSQL Fictional Creator",
      category: "UGC creator",
      email: "postgres.qa@creator.example",
      city: "Mumbai",
    });
    await services.updateTalent(talent.id, { city: "Pune" });
    assert.equal(
      (await getWorkspace()).talent.find((person) => person.id === talent.id)
        ?.city,
      "Pune",
    );
    const campaign = await services.createCampaign({
      brandName: "PostgreSQL Fictional Brand",
      name: "PostgreSQL Workflow Check",
      budgetPaise: 1_500_000,
      startDate: new Date().toISOString(),
      endDate: future,
      approvalRequired: true,
    });
    expectedCampaignId = campaign.id;
    const assignment = await services.assignTalent(campaign.id, {
      talentId: talent.id,
      task: "One reviewed reel",
      dueDate: future,
    });
    await services.updateAssignment(assignment.id, { status: "CONFIRMED" });
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "SUBMITTED",
      url: "https://example.com/faymio/postgres/reel",
    });
    await services.updateAssignment(assignment.id, {
      approvalStatus: "CHANGES_REQUESTED",
    });
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "SUBMITTED",
      url: "https://example.com/faymio/postgres/revised-reel",
    });
    await services.updateAssignment(assignment.id, {
      approvalStatus: "APPROVED",
    });
    await services.updateAssignment(assignment.id, {
      deliverableStatus: "PUBLISHED",
    });
    const published = (await getWorkspace()).campaigns.find(
      (record) => record.id === campaign.id,
    );
    assert.ok(published);
    assert.equal(metrics([published]).completed, 1);
    assert.equal(metrics([published]).approvals, 0);
    await services.deleteTalent(talent.id);
    assert.equal(
      (await getWorkspace()).talent.some((person) => person.id === talent.id),
      false,
    );
    assert.ok(
      (await db.talent.findUniqueOrThrow({ where: { id: talent.id } }))
        .deletedAt,
    );
    assert.equal(
      (
        await db.campaignAssignment.findUniqueOrThrow({
          where: { id: assignment.id },
        })
      ).talentId,
      talent.id,
    );
    log(
      "POSTGRES PASS: talent create/edit/archive, retained history, campaign creation and full submit/review/publish workflow",
    );

    const foreignOrganization = await db.organization.create({
      data: { name: "PostgreSQL Foreign QA Organization" },
    });
    const foreignTalent = await db.talent.create({
      data: {
        organizationId: foreignOrganization.id,
        fullName: "Foreign QA Creator",
        category: "Actor",
        email: "foreign.pg@example.test",
        city: "Delhi",
      },
    });
    const foreignBrand = await db.brand.create({
      data: {
        organizationId: foreignOrganization.id,
        name: "Foreign QA Brand",
      },
    });
    const foreignCampaign = await db.campaign.create({
      data: {
        organizationId: foreignOrganization.id,
        brandId: foreignBrand.id,
        name: "Foreign QA Campaign",
        budgetPaise: 100,
        startDate: new Date(),
        endDate: new Date(future),
        manager: "Foreign QA Manager",
      },
    });
    const foreignAssignment = await db.campaignAssignment.create({
      data: {
        organizationId: foreignOrganization.id,
        campaignId: foreignCampaign.id,
        talentId: foreignTalent.id,
        task: "Foreign QA work",
        dueDate: new Date(future),
      },
    });
    const activityCount = await db.activityLog.count();
    await assert.rejects(
      services.updateTalent(foreignTalent.id, { city: "Changed" }),
      { status: 404 },
    );
    await assert.rejects(
      services.updateCampaign(foreignCampaign.id, { name: "Changed" }),
      { status: 404 },
    );
    await assert.rejects(services.exportCampaign(foreignCampaign.id), {
      status: 404,
    });
    await assert.rejects(
      services.updateAssignment(foreignAssignment.id, { status: "CONFIRMED" }),
      { status: 404 },
    );
    await assert.rejects(
      services.assignTalent(campaign.id, {
        talentId: foreignTalent.id,
        task: "Foreign ID check",
        dueDate: future,
      }),
      { status: 404 },
    );
    await assert.rejects(
      services.createTask(campaign.id, {
        title: "Foreign nested ID check",
        assignmentId: foreignAssignment.id,
        dueDate: future,
      }),
      { status: 404 },
    );
    assert.equal(await db.activityLog.count(), activityCount);
    const scoped = await getWorkspace();
    expectedCampaignCount = scoped.campaigns.length;
    assert.equal(
      scoped.talent.some((person) => person.id === foreignTalent.id),
      false,
    );
    assert.equal(
      scoped.campaigns.some((record) => record.id === foreignCampaign.id),
      false,
    );
    assert.equal(
      (await db.talent.findUniqueOrThrow({ where: { id: foreignTalent.id } }))
        .city,
      "Delhi",
    );
    log(
      "POSTGRES PASS: foreign organization IDs and nested relation IDs denied without disclosure or writes",
    );
  } finally {
    await db.$disconnect();
  }
  await buildAndSmoke(expectedCampaignId, expectedCampaignCount);
}

main().catch((error) => {
  // Avoid logging a connection string or generated database password on failure.
  console.error("PostgreSQL integration verification failed.");
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "Inspect the failing database/service operation; connection details are intentionally not printed.",
  );
  process.exitCode = 1;
});
