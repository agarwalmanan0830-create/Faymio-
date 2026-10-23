import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildEnvironments,
  redactOutput,
  runVercelBuild,
} from "../scripts/vercel-build.mjs";

const pooled =
  "postgresql://demo_user:pooled-secret@pool.example:5432/faymio?sslmode=require";
const direct =
  "postgres://demo_user:direct-secret@db.example:5432/faymio?sslmode=require";
const base = {
  DEMO_MODE: "true",
  ALLOW_DEMO_IN_PRODUCTION: "true",
  DATABASE_URL: pooled,
};

test("refuses missing demo consent before starting a child process", () => {
  for (const env of [
    {},
    { ...base, DEMO_MODE: "false" },
    { ...base, ALLOW_DEMO_IN_PRODUCTION: undefined },
  ]) {
    let started = false;
    assert.throws(
      () =>
        runVercelBuild({
          env,
          run: () => {
            started = true;
          },
          log: () => {},
        }),
      /DEMO_MODE=true.*ALLOW_DEMO_IN_PRODUCTION=true/,
    );
    assert.equal(started, false);
  }
});

test("rejects missing, SQLite, malformed, and non-PostgreSQL URLs without exposing their values", () => {
  for (const value of [
    undefined,
    "file:./dev.db",
    "https://user:private-value@example.com/db",
    "postgresql://user:private-value@db.example",
    "postgresql://user:private-value@db.example/database#fragment",
    "invalid",
  ]) {
    try {
      buildEnvironments({ ...base, DATABASE_URL: value });
      assert.fail("Invalid connection URL should be rejected");
    } catch (error) {
      assert.match(error.message, /PostgreSQL connection URL/);
      assert.equal(error.message.includes("private-value"), false);
      assert.equal(error.message.includes(String(value)), false);
    }
  }
});

test("resolves provider-injected runtime variables and a separate direct migration connection", () => {
  const env = {
    ...base,
    DIRECT_URL: direct,
    OPENAI_API_KEY: "private-ai-key",
    PATH: "/runtime/bin",
  };
  const original = { ...env };
  const result = buildEnvironments(env);
  assert.equal(result.runtime.DATABASE_URL, pooled);
  assert.equal(result.migration.DATABASE_URL, direct);
  assert.equal(result.runtime.NODE_ENV, "production");
  assert.equal(result.runtime.OPENAI_API_KEY, "private-ai-key");
  assert.equal(result.runtime.PATH, "/runtime/bin");
  assert.deepEqual(env, original);
  assert.equal(
    buildEnvironments({
      ...base,
      DATABASE_URL: undefined,
      POSTGRES_PRISMA_URL: pooled,
      POSTGRES_URL: direct,
    }).runtime.DATABASE_URL,
    pooled,
  );
  assert.equal(
    buildEnvironments({
      ...base,
      DATABASE_URL: undefined,
      POSTGRES_URL: pooled,
      POSTGRES_URL_NON_POOLING: direct,
    }).migration.DATABASE_URL,
    direct,
  );
  assert.equal(
    buildEnvironments({ ...base, DATABASE_URL_UNPOOLED: direct }).migration
      .DATABASE_URL,
    direct,
  );
  assert.equal(
    buildEnvironments({
      ...base,
      DIRECT_URL: direct,
      DATABASE_URL_UNPOOLED: pooled,
    }).migration.DATABASE_URL,
    direct,
  );
  assert.equal(
    buildEnvironments({
      ...base,
      DATABASE_URL_UNPOOLED: direct,
      POSTGRES_URL_NON_POOLING: pooled,
    }).migration.DATABASE_URL,
    direct,
  );
  assert.equal(buildEnvironments(base).migration.DATABASE_URL, pooled);
  assert.throws(
    () => buildEnvironments({ ...base, DIRECT_URL: "file:./local.db" }),
    /DIRECT_URL/,
  );
});

test("runs only the PostgreSQL generate/migrate, idempotent seed, and Next build in order", () => {
  const calls = [];
  const logs = [];
  runVercelBuild({
    env: { ...base, DIRECT_URL: direct },
    run: (args, env) => {
      calls.push({ args, env });
      return { status: 0 };
    },
    log: (message) => logs.push(message),
  });
  assert.deepEqual(
    calls.map(({ args }) => args),
    [
      [
        join("node_modules", "prisma", "build", "index.js"),
        "generate",
        "--schema",
        "prisma/postgres/schema.prisma",
      ],
      [
        join("node_modules", "prisma", "build", "index.js"),
        "migrate",
        "deploy",
        "--schema",
        "prisma/postgres/schema.prisma",
      ],
      ["--import", "tsx", "prisma/seed.ts"],
      [join("node_modules", "next", "dist", "bin", "next"), "build"],
    ],
  );
  assert.deepEqual(
    calls.map(({ env }) => env.DATABASE_URL),
    [pooled, direct, pooled, pooled],
  );
  assert.match(logs.at(-1), /build completed/);
});

test("stops after a migration failure and redacts URL, password, and API credentials from child output", () => {
  const logs = [];
  let count = 0;
  const env = {
    ...base,
    DIRECT_URL: direct,
    OPENAI_API_KEY: "secret-api-credential",
  };
  assert.throws(
    () =>
      runVercelBuild({
        env,
        run: () => {
          count += 1;
          return count === 1
            ? { status: 0 }
            : {
                status: 1,
                stdout: `runtime=${pooled} direct=${direct}`,
                stderr:
                  "password direct-secret; other pooled-secret; key secret-api-credential",
              };
        },
        log: (message) => logs.push(message),
      }),
    /Applying PostgreSQL migrations failed/,
  );
  assert.equal(count, 2);
  const output = logs.join("\n");
  for (const credential of [
    pooled,
    direct,
    "direct-secret",
    "pooled-secret",
    "secret-api-credential",
  ]) {
    assert.equal(output.includes(credential), false);
  }
  assert.match(output, /REDACTED/);
  assert.equal(output.includes("build completed"), false);
});

test("does not expose thrown process errors or encoded credentials", () => {
  const env = {
    ...base,
    DATABASE_URL: "postgresql://secret-user:p%40ssword@db.example/faymio",
  };
  const output = redactOutput(
    `${env.DATABASE_URL} p%40ssword p@ssword secret-user`,
    env,
  );
  for (const secret of [
    env.DATABASE_URL,
    "p%40ssword",
    "p@ssword",
    "secret-user",
  ])
    assert.equal(output.includes(secret), false);
  assert.throws(
    () =>
      runVercelBuild({
        env,
        log: () => {},
        run: () => {
          throw new Error(env.DATABASE_URL);
        },
      }),
    (error) => {
      assert.match(error.message, /failed to start/);
      assert.equal(error.message.includes(env.DATABASE_URL), false);
      return true;
    },
  );
});

test("PostgreSQL schema preserves every SQLite model and declares a provider-specific migration", () => {
  const sqlite = readFileSync(
    new URL("../prisma/schema.prisma", import.meta.url),
    "utf8",
  );
  const postgres = readFileSync(
    new URL("../prisma/postgres/schema.prisma", import.meta.url),
    "utf8",
  );
  assert.equal(
    postgres.replace('provider = "postgresql"', 'provider = "sqlite"'),
    sqlite,
  );
  const migration = readFileSync(
    new URL(
      "../prisma/postgres/migrations/202610230001_init/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const modelNames = [...sqlite.matchAll(/^model (\w+) \{/gm)].map(
    (match) => match[1],
  );
  for (const name of modelNames)
    assert.match(
      migration,
      new RegExp(`CREATE TABLE "(?:public"\\.")?${name}"`),
    );
  assert.match(
    readFileSync(
      new URL(
        "../prisma/postgres/migrations/migration_lock.toml",
        import.meta.url,
      ),
      "utf8",
    ),
    /provider = "postgresql"/,
  );
  const vercel = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(vercel, {
    framework: "nextjs",
    buildCommand: "npm run vercel-build",
    installCommand: "npm ci --include=dev",
  });
});
