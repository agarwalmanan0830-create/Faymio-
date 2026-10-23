"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Clapperboard,
  Users,
  CheckCheck,
  Clock3,
  Sparkles,
  Check,
  Wallet,
  ChevronRight,
  CalendarDays,
  FileText,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui";
import { CampaignList } from "@/components/campaign-list";
import { CampaignCreate } from "@/components/campaign-create";
import { metrics } from "@/lib/metrics";
import { date } from "@/lib/utils";
export default function Dashboard() {
  const { data } = useWorkspace();
  const [create, setCreate] = useState(false);
  if (!data) return null;
  const m = metrics(data.campaigns),
    glow = data.campaigns.find((c) => c.id === "glow-lab") || data.campaigns[0],
    g = glow ? metrics([glow]) : m;
  const assignments = data.campaigns.flatMap((c) => c.assignments);
  const statuses = [
    { name: "Published", value: m.completed, color: "#7967ED" },
    {
      name: "Submitted",
      value: assignments.filter((a) => a.deliverable?.status === "SUBMITTED")
        .length,
      color: "#B3A7F5",
    },
    {
      name: "In progress",
      value: assignments.filter(
        (a) =>
          a.deliverable?.status === "IN_PROGRESS" ||
          a.deliverable?.status === "APPROVED",
      ).length,
      color: "#D9D2FF",
    },
    {
      name: "Not started",
      value: assignments.filter(
        (a) => !a.deliverable || a.deliverable.status === "NOT_STARTED",
      ).length,
      color: "#EDECEF",
    },
  ];
  const deadlineData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() + i);
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      name:
        i === 0
          ? "Today"
          : day.toLocaleDateString("en-IN", { weekday: "short" }),
      Tasks:
        data.campaigns
          .flatMap((c) => c.tasks)
          .filter(
            (t) =>
              t.status !== "COMPLETED" &&
              new Date(t.dueDate) >= start &&
              new Date(t.dueDate) < end,
          ).length +
        assignments.filter(
          (a) =>
            a.deliverable?.status !== "PUBLISHED" &&
            new Date(a.dueDate) >= start &&
            new Date(a.dueDate) < end,
        ).length,
    };
  });
  const actions = [
    {
      title: "Content ready for your review",
      description: `${m.approvals} submissions are waiting for approval`,
      count: m.approvals,
      icon: CheckCheck,
      color: "purple",
      href: "/campaigns?view=approvals",
    },
    {
      title: "A nudge could move things along",
      description: `${m.overdue} operational tasks are overdue`,
      count: m.overdue,
      icon: Clock3,
      color: "amber",
      href: "/campaigns?view=overdue",
    },
    {
      title: "Keep the commercial side clear",
      description: `${m.payments} payments need a follow-up`,
      count: m.payments,
      icon: Wallet,
      color: "rose",
      href: "/campaigns?view=payments",
    },
  ];
  const kpis = [
    {
      label: "Active campaigns",
      value: m.active,
      detail: "Ideas becoming real",
      icon: Clapperboard,
      href: "/campaigns",
      dark: true,
    },
    {
      label: "Assigned talent",
      value: m.assigned,
      detail: `${m.confirmed} confirmed and ready`,
      icon: Users,
      href: "/campaigns?view=assigned",
    },
    {
      label: "Published deliverables",
      value: m.completed,
      detail: "Out there, making an impact",
      icon: CheckCheck,
      href: "/campaigns?view=completed",
    },
    {
      label: "Pending approvals",
      value: m.approvals,
      detail: "Your attention moves them forward",
      icon: Clock3,
      href: "/campaigns?view=approvals",
    },
  ];
  return (
    <div className="page dashboard-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-star">✦</span> A LITTLE CLARITY. A LOT OF
            MOMENTUM.
          </div>
          <h1>
            Your work, in the spotlight<span className="accent-dot">.</span>
          </h1>
          <p>A clear view of your campaigns, talent, and what comes next.</p>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" href="/briefs">
            <FileText size={16} />
            New brief
          </Link>
          <Button onClick={() => setCreate(true)}>
            <Plus size={17} />
            Create campaign
          </Button>
        </div>
      </div>
      <div className="overview-context">
        <span>
          <span className="status-live" />
          Workspace overview
        </span>
        <span>
          <CalendarDays size={14} />
          {new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }).format(new Date())}
        </span>
      </div>
      <div className="kpi-grid">
        {kpis.map(({ label, value, detail, icon: Icon, href, dark }) => (
          <Link
            key={label}
            href={href}
            className={`kpi-card ${dark ? "kpi-dark" : ""}`}
          >
            <div className="kpi-top">
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <div className="kpi-number">
              {String(value).padStart(2, "0")}
              <span>
                <ArrowUpRight size={19} />
              </span>
            </div>
            <p>{detail}</p>
          </Link>
        ))}
      </div>
      <div className="kpi-secondary-grid">
        {[
          {
            name: "Confirmed talent",
            value: m.confirmed,
            view: "confirmed",
            Icon: Users,
          },
          {
            name: "Overdue tasks",
            value: m.overdue,
            view: "overdue",
            Icon: Clock3,
          },
          {
            name: "Payments needing follow-up",
            value: m.payments,
            view: "payments",
            Icon: Wallet,
          },
        ].map(({ name, value, view, Icon }) => (
          <Link
            key={view}
            href={`/campaigns?view=${view}`}
            className="kpi-secondary"
          >
            <Icon size={15} />
            <span>{name}</span>
            <strong>{String(value).padStart(2, "0")}</strong>
            <ArrowUpRight size={13} />
          </Link>
        ))}
      </div>
      <div className="dashboard-main-grid">
        <section className="spotlight-card">
          <div className="spotlight-content">
            <div className="eyebrow">
              <span className="status-live" />
              CAMPAIGN IN FOCUS
            </div>
            <Link href={glow ? `/campaigns/${glow.id}` : "/campaigns"}>
              <h2>
                {glow?.name || "Your next campaign"}
                <ArrowUpRight size={22} />
              </h2>
            </Link>
            <p>
              {glow?.brand.name} <span>·</span>{" "}
              {glow
                ? `${Math.round((new Date(glow.endDate).getTime() - new Date(glow.startDate).getTime()) / 86400000)}-day campaign`
                : "Start something new"}
            </p>
            <div className="spotlight-stats">
              <Link href={`/campaigns/${glow?.id}?filter=confirmed`}>
                <strong>
                  {g.confirmed}
                  <span>/{g.total}</span>
                </strong>
                <small>Talent confirmed</small>
              </Link>
              <div className="spotlight-stat-divider" />
              <div>
                <strong>
                  {g.completed}
                  <span>/{g.total}</span>
                </strong>
                <small>Deliverables published</small>
              </div>
              <Link
                className="spotlight-open"
                href={`/campaigns/${glow?.id}`}
                aria-label="Open highlighted campaign"
              >
                <ArrowUpRight size={24} />
              </Link>
            </div>
            <div className="spotlight-progress">
              <div>
                <span>Campaign completion</span>
                <strong>
                  {g.total ? Math.round((g.completed / g.total) * 100) : 0}%
                </strong>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${g.total ? (g.completed / g.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="spotlight-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <svg className="art-star" viewBox="0 0 100 100" fill="none">
              <path
                d="M50 12v76M12 50h76M23 23l54 54M23 77l54-54"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
            <span className="art-caption">
              GOOD WORK.
              <br />
              GREAT COMPANY.
            </span>
          </div>
          <div className="spotlight-footer">
            <span>
              <Sparkles size={15} />{" "}
              {g.approvals
                ? `${g.approvals} submissions ready. Your review is the next step.`
                : "Your campaign is taking shape."}
            </span>
            <Link href={`/campaigns/${glow?.id}?filter=approvals`}>
              Review now <ArrowRight size={15} />
            </Link>
          </div>
        </section>
        <section className="card priority-card">
          <div className="card-heading">
            <div>
              <h2>
                Needs your attention <span className="attention-dot" />
              </h2>
              <p>Small actions. Real momentum.</p>
            </div>
            <span className="count-pill">
              {m.approvals + m.overdue + m.payments}
            </span>
          </div>
          <div className="priority-items">
            {actions.map(({ title, description, icon: Icon, color, href }) => (
              <Link className="priority-item" key={title} href={href}>
                <span className={`action-icon ${color}`}>
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
          <div className="priority-footer">
            <span>Human decisions. Always.</span>
            <Check size={13} />
          </div>
        </section>
      </div>
      <div className="insight-grid">
        <section className="card status-chart-card">
          <div className="card-heading">
            <h2>Deliverables at a glance</h2>
            <span className="text-small muted">{assignments.length} total</span>
          </div>
          <div className="donut-content">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={135}>
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={statuses.filter((s) => s.value)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={47}
                    outerRadius={61}
                    paddingAngle={4}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {statuses
                      .filter((s) => s.value)
                      .map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{m.completed}</strong>
                <small>published</small>
              </div>
            </div>
            <div className="chart-legend">
              {statuses.map((s) => (
                <div key={s.name}>
                  <span>
                    <i style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="card momentum-card">
          <div className="card-heading">
            <h2>Campaign momentum</h2>
            <span className="text-small muted">Published / assigned</span>
          </div>
          <div className="momentum-list">
            {data.campaigns
              .filter((c) => c.status !== "DRAFT")
              .slice(0, 3)
              .map((c) => {
                const cm = metrics([c]);
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`}>
                    <div>
                      <strong>{c.brand.name}</strong>
                      <span>
                        {cm.completed}/{cm.total}
                      </span>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${cm.total ? (cm.completed / cm.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
        <section className="card deadlines-card">
          <div className="card-heading">
            <h2>On the horizon</h2>
            <span className="text-small muted">Next 7 days</span>
          </div>
          <div className="deadline-chart">
            <ResponsiveContainer width="100%" height={135}>
              <BarChart data={deadlineData} barSize={18}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#87908F", fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-alt)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    background: "var(--surface)",
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="Tasks"
                  fill="#B4A7F5"
                  radius={[4, 4, 2, 2]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <CampaignList compact />
      <div className="dashboard-bottom-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>The latest, as it happens</h2>
              <p>A shared memory for your team.</p>
            </div>
            <Link className="text-link" href="/activity">
              All activity <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="activity-list">
            {data.activity.slice(0, 4).map((a, i) => (
              <div className="activity-row" key={a.id}>
                <span className={`activity-symbol activity-${i % 3}`}>
                  {i % 2 ? (
                    <CheckCheck size={15} />
                  ) : (
                    <Clapperboard size={15} />
                  )}
                </span>
                <div>
                  <p>{a.message}</p>
                  <small>{date(a.createdAt)} · Demo workspace</small>
                </div>
                {a.campaignId && (
                  <Link
                    href={`/campaigns/${a.campaignId}`}
                    aria-label="Open related campaign"
                  >
                    <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="copilot-promo">
          <div className="copilot-top">
            <span className="sparkle-tile">
              <Sparkles size={21} />
            </span>
            <span className="mode-pill">
              {data.aiMode === "demo" ? "Demo AI mode" : "Provider configured"}
            </span>
          </div>
          <h2>
            A clearer picture.
            <br />
            One question away.
          </h2>
          <p>
            {m.approvals} approvals are waiting, {m.overdue} tasks need
            attention, and {m.completed} deliverables are published. Your
            copilot can help plan the next step.
          </p>
          <Link
            className="copilot-example"
            href="/assistant?q=Prepare%20a%20summary%20for%20the%20brand"
          >
            <span>“Prepare a summary for the brand”</span>
            <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" href="/assistant">
            Open operations assistant <ArrowRight size={15} />
          </Link>
          <small className="copilot-disclaimer">
            {data.aiMode === "demo"
              ? "Database-backed summary · Deterministic demo"
              : "Database-backed operational context"}
          </small>
        </section>
      </div>
      <CampaignCreate open={create} onOpenChange={setCreate} />
    </div>
  );
}
