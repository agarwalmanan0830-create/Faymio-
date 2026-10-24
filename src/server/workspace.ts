import { db } from "@/lib/db";
import { getContext } from "./context";
import type { Workspace } from "@/types";
export async function getWorkspace(): Promise<Workspace> {
  const { organizationId, userId } = await getContext();
  const [organization, user, talent, campaigns, activity] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true },
    }),
    db.user.findFirstOrThrow({
      where: { id: userId, organizationId },
      select: { name: true, email: true },
    }),
    db.talent.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { fullName: "asc" },
    }),
    db.campaign.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        brand: true,
        assignments: {
          where: { organizationId },
          include: {
            talent: true,
            deliverable: true,
            approval: true,
            payment: true,
          },
          orderBy: { createdAt: "asc" },
        },
        tasks: { where: { organizationId }, orderBy: { dueDate: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.activityLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return JSON.parse(
    JSON.stringify({
      organization,
      user,
      talent,
      campaigns,
      activity,
      aiMode: process.env.OPENAI_API_KEY ? "live" : "demo",
    }),
  );
}
