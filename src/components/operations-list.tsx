"use client";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace-provider";
import { Avatar, Badge, Empty } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";
import { date, money } from "@/lib/utils";
const titles: Record<string, string> = {
  assigned: "Assigned talent",
  confirmed: "Confirmed assignments",
  completed: "Published deliverables",
  approvals: "Pending approvals",
  overdue: "Overdue operational tasks",
  payments: "Payment follow-ups",
};
export function OperationsList({ view }: { view: string }) {
  const { data } = useWorkspace();
  if (!data || !titles[view]) return null;
  const tasks = data.campaigns.flatMap((c) =>
    c.tasks
      .filter(
        (t) => t.status !== "COMPLETED" && new Date(t.dueDate) < new Date(),
      )
      .map((t) => ({ ...t, campaign: c })),
  );
  const rows = data.campaigns.flatMap((c) =>
    c.assignments
      .filter(
        (a) =>
          view === "assigned" ||
          (view === "confirmed" && a.status === "CONFIRMED") ||
          (view === "completed" && a.deliverable?.status === "PUBLISHED") ||
          (view === "approvals" && a.approval?.status === "PENDING") ||
          (view === "payments" &&
            a.payment?.followUp &&
            a.payment.status !== "PAID"),
      )
      .map((a) => ({ ...a, campaign: c })),
  );
  return (
    <section className="card mb-6">
      <div className="card-heading">
        <div>
          <h2>{titles[view]}</h2>
          <p>Across all campaigns in this workspace.</p>
        </div>
        <Link href="/campaigns" className="text-link">
          All campaigns
        </Link>
      </div>
      {view === "overdue" ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>TASK</th>
                <th>CAMPAIGN</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.campaign.name}</td>
                  <td>{date(t.dueDate, true)}</td>
                  <td>
                    <Badge status="OVERDUE" />
                  </td>
                  <td>
                    <Link
                      className="icon-button"
                      href={`/campaigns/${t.campaign.id}?filter=overdue`}
                      aria-label="Open task campaign"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>TALENT</th>
                <th>CAMPAIGN</th>
                <th>ASSIGNMENT</th>
                <th>{view === "payments" ? "INVOICE" : "DELIVERABLE"}</th>
                <th>DUE DATE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={a.talent.fullName} size="sm" />
                      {a.talent.fullName}
                    </div>
                  </td>
                  <td>{a.campaign.name}</td>
                  <td>
                    <Badge status={a.status} />
                  </td>
                  <td>
                    {view === "payments" ? (
                      money(a.payment?.amountPaise || 0)
                    ) : (
                      <Badge
                        status={
                          view === "approvals"
                            ? "PENDING"
                            : a.deliverable?.status || "NOT_STARTED"
                        }
                      />
                    )}
                  </td>
                  <td>{date(a.dueDate, true)}</td>
                  <td>
                    <Link
                      className="icon-button"
                      href={`/campaigns/${a.campaign.id}?filter=${view}`}
                      aria-label={`Open ${a.talent.fullName}'s campaign`}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(view === "overdue" ? !tasks.length : !rows.length) && (
        <Empty
          title="You're all caught up"
          description="No records need attention in this view."
        />
      )}
    </section>
  );
}
