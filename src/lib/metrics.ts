import type { Campaign } from "@/types";
export function metrics(campaigns: Campaign[], now = new Date()) {
  const assignments = campaigns.flatMap((c) => c.assignments);
  return {
    active: campaigns.filter((c) => c.status === "ACTIVE").length,
    assigned: new Set(assignments.map((a) => a.talentId)).size,
    confirmed: assignments.filter((a) => a.status === "CONFIRMED").length,
    completed: assignments.filter((a) => a.deliverable?.status === "PUBLISHED")
      .length,
    approvals: assignments.filter((a) => a.approval?.status === "PENDING")
      .length,
    overdue: campaigns
      .flatMap((c) => c.tasks)
      .filter((t) => t.status !== "COMPLETED" && new Date(t.dueDate) < now)
      .length,
    payments: assignments.filter(
      (a) => a.payment?.followUp && a.payment.status !== "PAID",
    ).length,
    total: assignments.length,
  };
}
