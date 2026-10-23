import { loadEnvFile } from "node:process";
import { openSync, closeSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
// Prisma's SQLite migrate deploy can fail opaquely when its database file does not yet exist.
// Preparing an empty file is safe to rerun and never replaces an existing database.
try {
  loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("file:")) {
  const path = resolve(
    "prisma",
    decodeURIComponent(databaseUrl.slice(5).split("?")[0]),
  );
  mkdirSync(dirname(path), { recursive: true });
  closeSync(openSync(path, "a"));
}
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: process.env },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
