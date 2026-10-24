import { PrismaClient } from "@prisma/client";
import { seedDemo } from "./demo-data";
const db = new PrismaClient();
seedDemo(db)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
