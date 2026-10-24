import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
// Vercel database integrations can inject provider-specific URLs. Runtime must
// resolve these too: environment normalization in a build subprocess is temporary.
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;
export const db =
  globalForPrisma.prisma ??
  new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
