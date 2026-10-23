import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const constructor = vi.hoisted(() => vi.fn());
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor(options?: unknown) {
      constructor(options);
    }
  },
}));

const globalWithPrisma = globalThis as unknown as { prisma?: unknown };
let originalClient: unknown;

beforeEach(() => {
  originalClient = globalWithPrisma.prisma;
  delete globalWithPrisma.prisma;
  constructor.mockClear();
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("POSTGRES_PRISMA_URL", "");
  vi.stubEnv("POSTGRES_URL", "");
});

afterEach(() => {
  if (originalClient === undefined) delete globalWithPrisma.prisma;
  else globalWithPrisma.prisma = originalClient;
  vi.unstubAllEnvs();
});

describe("runtime Prisma database configuration", () => {
  it("keeps explicit local SQLite DATABASE_URL ahead of provider fallbacks", async () => {
    vi.stubEnv("DATABASE_URL", "file:./dev.db");
    vi.stubEnv("POSTGRES_PRISMA_URL", "postgresql://db.example/provider");
    await import("../src/lib/db");
    expect(constructor).toHaveBeenCalledWith({
      datasourceUrl: "file:./dev.db",
    });
  });

  it("uses POSTGRES_PRISMA_URL when the integration does not define DATABASE_URL", async () => {
    vi.stubEnv("POSTGRES_PRISMA_URL", "postgresql://pool.example/faymio");
    vi.stubEnv("POSTGRES_URL", "postgresql://fallback.example/faymio");
    await import("../src/lib/db");
    expect(constructor).toHaveBeenCalledWith({
      datasourceUrl: "postgresql://pool.example/faymio",
    });
  });

  it("uses POSTGRES_URL as the last provider fallback", async () => {
    vi.stubEnv("POSTGRES_URL", "postgresql://db.example/faymio");
    await import("../src/lib/db");
    expect(constructor).toHaveBeenCalledWith({
      datasourceUrl: "postgresql://db.example/faymio",
    });
  });

  it("preserves Prisma's default environment behavior when no URL is configured", async () => {
    await import("../src/lib/db");
    expect(constructor).toHaveBeenCalledWith(undefined);
  });
});
