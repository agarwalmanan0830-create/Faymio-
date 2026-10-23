import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { seedDemo } from "../prisma/demo-data";

export default async function setup() {
  const filename = "/tmp/faymio-e2e.db";
  rmSync(filename, { force: true });
  rmSync(`${filename}-journal`, { force: true });
  writeFileSync(filename, "");
  const db = new PrismaClient({ datasourceUrl: `file:${filename}` });
  try {
    const directory = join(process.cwd(), "prisma", "migrations");
    for (const migration of readdirSync(directory)
      .filter((n) => /^\d/.test(n))
      .sort()) {
      const sql = readFileSync(
        join(directory, migration, "migration.sql"),
        "utf8",
      );
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await db.$executeRawUnsafe(statement);
    }
    await seedDemo(db);
  } finally {
    await db.$disconnect();
  }
}
