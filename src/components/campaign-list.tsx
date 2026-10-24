"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight, Plus } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { Avatar, Badge, Input, Button, Empty } from "@/components/ui";
import { CampaignCreate } from "@/components/campaign-create";
import { date, money } from "@/lib/utils";
import { metrics } from "@/lib/metrics";
export function CampaignList({ compact = false }: { compact?: boolean }) {
  const { data } = useWorkspace();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [create, setCreate] = useState(false);
  const campaigns =
    data?.campaigns.filter(
      (c) =>
        (filter === "ALL" || c.status === filter) &&
        `${c.name} ${c.brand.name}`.toLowerCase().includes(q.toLowerCase()),
    ) || [];
  return (
    <>
      <section className="card campaigns-card">
        <div className="card-heading">
          <div>
            <h2>
              {compact ? "Your campaigns" : "Campaign directory"}{" "}
              <span className="count-pill">{data?.campaigns.length || 0}</span>
            </h2>
            <p>Good work. All in one place.</p>
          </div>
          {compact ? (
            <Link className="text-link" href="/campaigns">
              View all <ArrowUpRight size={15} />
            </Link>
          ) : (
            <Button onClick={() => setCreate(true)}>
              <Plus size={16} />
              New campaign
            </Button>
          )}
        </div>
        <div className="campaign-toolbar">
          <div className="segmented">
            {["ALL", "ACTIVE", "DRAFT", "COMPLETED"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? "selected" : ""}
              >
                {f === "ALL"
                  ? "All campaigns"
                  : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="search-field compact-search">
            <Search size={15} />
            <Input
              aria-label="Search campaigns"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search campaigns…"
            />
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table campaign-table">
            <thead>
              <tr>
                <th>CAMPAIGN</th>
                <th>STATUS</th>
                <th>TALENT</th>
                <th>PROGRESS</th>
                <th>TIMELINE</th>
                <th>BUDGET</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, index) => {
                const m = metrics([c]),
                  progress = m.total
                    ? Math.round((m.completed / m.total) * 100)
                    : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="campaign-name-cell"
                        href={`/campaigns/${c.id}`}
                      >
                        <span className={`campaign-monogram mono-${index % 4}`}>
                          {c.brand.name
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span>
                          <strong>{c.name}</strong>
                          <small>{c.brand.name}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Badge status={c.status} />
                    </td>
                    <td>
                      <div className="avatar-stack">
                        {c.assignments.slice(0, 3).map((a) => (
                          <Avatar
                            key={a.id}
                            name={a.talent.fullName}
                            size="sm"
                          />
                        ))}
                        {c.assignments.length > 3 && (
                          <span className="avatar avatar-sm avatar-more">
                            +{c.assignments.length - 3}
                          </span>
                        )}
                        {!c.assignments.length && (
                          <span className="muted text-small">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-progress">
                        <div className="progress-track">
                          <span style={{ width: `${progress}%` }} />
                        </div>
                        <span>{progress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-small">
                        {date(c.startDate)} – {date(c.endDate)}
                      </span>
                    </td>
                    <td>
                      <strong className="money-small">
                        {money(c.budgetPaise)}
                      </strong>
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        href={`/campaigns/${c.id}`}
                        aria-label={`Open ${c.name}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!campaigns.length && (
            <Empty
              title="Room for something new"
              description="Try a different search or create your next campaign."
              action={
                <Button onClick={() => setCreate(true)}>
                  Create a campaign
                </Button>
              }
            />
          )}
        </div>
      </section>
      <CampaignCreate open={create} onOpenChange={setCreate} />
    </>
  );
}
