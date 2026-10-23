"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight, Activity as ActivityIcon } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { Input, Empty } from "@/components/ui";
import { date } from "@/lib/utils";
export default function Activity() {
  const { data } = useWorkspace();
  const [q, setQ] = useState(""),
    [campaign, setCampaign] = useState("ALL");
  const items =
    data?.activity.filter(
      (a) =>
        a.message.toLowerCase().includes(q.toLowerCase()) &&
        (campaign === "ALL" || a.campaignId === campaign),
    ) || [];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">A SHARED MEMORY</div>
          <h1>
            Every move, remembered<span className="accent-dot">.</span>
          </h1>
          <p>
            Campaign updates, decisions, and progress across your workspace.
          </p>
        </div>
      </div>
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <Input
            aria-label="Search activity"
            placeholder="Search activity…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter activity by campaign"
          className="input"
          style={{ maxWidth: 260 }}
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
        >
          <option value="ALL">All campaigns</option>
          {data?.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <section className="card activity-page-list">
        {items.map((a) => (
          <div key={a.id} className="activity-row">
            <span className="activity-symbol">
              <ActivityIcon size={16} />
            </span>
            <div>
              <p>{a.message}</p>
              <small>
                {date(a.createdAt, true)} ·{" "}
                {new Date(a.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </small>
            </div>
            {a.campaignId && (
              <Link
                href={`/campaigns/${a.campaignId}`}
                aria-label="Open related campaign"
              >
                <ArrowUpRight size={18} />
              </Link>
            )}
          </div>
        ))}
        {!items.length && (
          <Empty
            title="A quiet moment"
            description="No activity matches this view. Campaign updates will appear here."
          />
        )}
      </section>
    </div>
  );
}
