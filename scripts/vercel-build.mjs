import process from "node:process";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const postgresSchema = "prisma/postgres/schema.prisma";

function requirePostgresUrl(value, label) {
  try {
    if (typeof value !== "string" || value !== value.trim()) throw new Error();
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2 ||
      url.hash
    )
      throw new Error();
    return value;
  } catch {
    throw new Error(
      `${label} must be a PostgreSQL connection URL. Connect a PostgreSQL database in Vercel and configure the deployment environment variables. SQLite files cannot persist on Vercel.`,
    );
  }
}

export function buildEnvironments(source = process.env) {
  if (
    source.DEMO_MODE !== "true" ||
    source.ALLOW_DEMO_IN_PRODUCTION !== "true"
  ) {
    throw new Error(
      "This deployment is a fictional demo workspace. Set DEMO_MODE=true and ALLOW_DEMO_IN_PRODUCTION=true explicitly in Vercel before building. Real customer access requires authentication and authorization first.",
    );
  }
  const databaseUrl = requirePostgresUrl(
    source.DATABASE_URL || source.POSTGRES_PRISMA_URL || source.POSTGRES_URL,
    "DATABASE_URL (or POSTGRES_PRISMA_URL / POSTGRES_URL)",
  );
  const migrationUrl = requirePostgresUrl(
    source.DIRECT_URL ||
      source.DATABASE_URL_UNPOOLED ||
      source.POSTGRES_URL_NON_POOLING ||
      databaseUrl,
    "DIRECT_URL (or DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING)",
  );
  const runtime = {
    ...source,
    DATABASE_URL: databaseUrl,
    NODE_ENV: "production",
  };
  return {
    runtime,
    migration: { ...runtime, DATABASE_URL: migrationUrl },
  };
}

export function redactOutput(value, source = process.env) {
  const secrets = new Set();
  for (const [name, secret] of Object.entries(source)) {
    if (
      typeof secret !== "string" ||
      !secret ||
      !/(?:DATABASE_URL|DIRECT_URL|POSTGRES.*URL|SECRET|TOKEN|PASSWORD|API_KEY)/i.test(
        name,
      )
    )
      continue;
    secrets.add(secret);
    try {
      const url = new URL(secret);
      for (const credential of [url.username, url.password]) {
        if (!credential) continue;
        secrets.add(credential);
        try {
          secrets.add(decodeURIComponent(credential));
        } catch {
          /* Keep encoded form. */
        }
      }
    } catch {
      /* Non-URL credentials are redacted as exact values. */
    }
  }
  let output = String(value ?? "");
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    output = output.split(secret).join("[REDACTED]");
  }
  return output;
}

function runProcess(args, env) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result;
}

export function runVercelBuild({
  env = process.env,
  run = runProcess,
  log = (message) => console.log(message),
} = {}) {
  const environments = buildEnvironments(env);
  const redactionEnvironment = {
    ...env,
    FAYMIO_RUNTIME_DATABASE_URL: environments.runtime.DATABASE_URL,
    FAYMIO_MIGRATION_DATABASE_URL: environments.migration.DATABASE_URL,
  };
  const prisma = join("node_modules", "prisma", "build", "index.js");
  const steps = [
    {
      label: "Generating the PostgreSQL Prisma client",
      args: [prisma, "generate", "--schema", postgresSchema],
      env: environments.runtime,
    },
    {
      label: "Applying PostgreSQL migrations",
      args: [prisma, "migrate", "deploy", "--schema", postgresSchema],
      env: environments.migration,
    },
    {
      label: "Preparing fictional demo data without resetting existing edits",
      args: ["--import", "tsx", "prisma/seed.ts"],
      env: environments.runtime,
    },
    {
      label: "Building Faymio for Vercel",
      args: [join("node_modules", "next", "dist", "bin", "next"), "build"],
      env: environments.runtime,
    },
  ];
  for (const step of steps) {
    log(`${step.label}…`);
    let result;
    try {
      result = run(step.args, step.env);
    } catch {
      throw new Error(
        `${step.label} failed to start. Check the Vercel build environment.`,
      );
    }
    for (const output of [result.stdout, result.stderr]) {
      if (output) log(redactOutput(output, redactionEnvironment));
    }
    if (result.error || result.status !== 0) {
      // Child errors can contain connection credentials. Never pass them through.
      throw new Error(
        `${step.label} failed. Check the redacted build output and Vercel environment configuration.`,
      );
    }
  }
  log("Faymio Vercel build completed. Demo records are stored in PostgreSQL.");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    runVercelBuild();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
