"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  History,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  Input,
  Modal,
} from "@/components/ui";
import { useWorkspace, WorkspaceState } from "@/components/workspace-provider";
import { date, label, money } from "@/lib/utils";
import type { Assignment, Campaign } from "@/types";
import "@/components/campaigns/workflows.css";

type TrackerFilter =
  | "all"
  | "assigned"
  | "confirmed"
  | "completed"
  | "approvals"
  | "overdue"
  | "payments";
const isoDeadline = (value: string) => `${value}T18:29:59.000Z`;
const dateInput = (value: string) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const todayInput = () => dateInput(new Date().toISOString());

export default function CampaignPage() {
  const params = useParams<{ id: string }>();
  return (
    <WorkspaceState>
      <Tracker id={params.id} />
    </WorkspaceState>
  );
}
function Tracker({ id }: { id: string }) {
  const { data, mutate } = useWorkspace();
  const campaign = data?.campaigns.find((c) => c.id === id);
  const [tab, setTab] = useState<"execution" | "tasks" | "activity">(
    "execution",
  );
  const [filter, setFilter] = useState<TrackerFilter>("all");
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false),
    [taskOpen, setTaskOpen] = useState(false),
    [noteOpen, setNoteOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("filter");
    if (
      q &&
      [
        "assigned",
        "confirmed",
        "completed",
        "approvals",
        "overdue",
        "payments",
      ].includes(q)
    )
      setFilter(q as TrackerFilter);
  }, []);
  if (!campaign)
    return (
      <div className="page">
        <Empty
          title="Campaign not found"
          description="This campaign is unavailable in your current workspace."
          action={
            <Link href="/campaigns" className="button button-secondary">
              Back to campaigns
            </Link>
          }
        />
      </div>
    );
  const c = campaign;
  const published = c.assignments.filter(
    (a) => a.deliverable?.status === "PUBLISHED",
  ).length;
  const approvals = c.assignments.filter(
    (a) => a.approval?.status === "PENDING",
  );
  const overdueTasks = c.tasks.filter(
    (t) => t.status !== "COMPLETED" && new Date(t.dueDate) < new Date(),
  );
  const followUps = c.assignments.filter(
    (a) => a.payment?.followUp && a.payment.status !== "PAID",
  );
  const confirmed = c.assignments.filter(
    (a) => a.status === "CONFIRMED",
  ).length;
  const progress = c.assignments.length
    ? Math.round((published / c.assignments.length) * 100)
    : 0;
  const visible = c.assignments.filter((a) => {
    const matches =
      !search ||
      [a.talent.fullName, a.talent.category, a.task].some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      );
    if (!matches) return false;
    if (filter === "confirmed") return a.status === "CONFIRMED";
    if (filter === "completed") return a.deliverable?.status === "PUBLISHED";
    if (filter === "approvals") return a.approval?.status === "PENDING";
    if (filter === "payments")
      return a.payment?.followUp && a.payment.status !== "PAID";
    if (filter === "overdue")
      return overdueTasks.some((t) => t.assignmentId === a.id);
    return true;
  });
  const activeAssignment = c.assignments.find((a) => a.id === editing);
  const activity = (data?.activity || []).filter((a) => a.campaignId === c.id);
  const quickUpdate = async (a: Assignment, body: unknown, message: string) => {
    setBusy(a.id);
    try {
      await mutate(`/api/assignments/${a.id}`, body, "PATCH");
      toast.success(message);
    } catch {
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="page wf-page">
      <Link href="/campaigns" className="wf-back">
        <ArrowLeft size={14} /> Campaigns <ChevronRight size={13} />{" "}
        {c.brand.name}
      </Link>
      <div className="page-heading wf-heading">
        <div>
          <div className="eyebrow">
            CAMPAIGN WORKSPACE <span className="wf-demo">DEMO DATA</span>
          </div>
          <h1>{c.name}</h1>
          <p>Every creator. Every deliverable. One clear view.</p>
        </div>
        <div className="wf-heading-actions">
          <Button variant="secondary" onClick={() => setDetailsOpen(true)}>
            <Edit3 size={15} />
            Edit campaign
          </Button>
          <a
            className="button button-secondary"
            href={`/api/campaigns/${c.id}/export`}
          >
            <Download size={15} /> Export CSV
          </a>
          <Button onClick={() => setAssignOpen(true)}>
            <Plus size={16} /> Assign talent
          </Button>
        </div>
      </div>
      <div className="card wf-campaign-summary">
        <div className="wf-brand-mark">
          {c.brand.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="wf-summary-main">
          <div className="wf-summary-title">
            <h3>{c.brand.name}</h3>
            <Badge status={c.status} />
          </div>
          <p>{c.objective || c.deliverableBrief}</p>
          <div className="wf-summary-meta">
            <span>
              <CalendarDays size={14} />
              {date(c.startDate)} – {date(c.endDate, true)}
            </span>
            <span>
              <Avatar name={c.manager} size="sm" />
              {c.manager}
            </span>
            <span>
              <ShieldCheck size={14} />
              {c.approvalRequired
                ? "Brand approval required"
                : "Approval optional"}
            </span>
          </div>
        </div>
        <div className="wf-progress-block">
          <span>
            <strong>{progress}%</strong> published
          </span>
          <div className="wf-progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <small>
            {published} of {c.assignments.length} creator deliverables
          </small>
        </div>
      </div>
      <div className="wf-stat-grid">
        <button
          className="card wf-stat"
          onClick={() => {
            setTab("execution");
            setFilter("all");
          }}
        >
          <span>
            <Users size={16} />
            Assigned talent
          </span>
          <strong>
            {c.assignments.length}
            <small> / {c.creatorCount} planned</small>
          </strong>
          <em>{confirmed} confirmed</em>
        </button>
        <button
          className="card wf-stat"
          onClick={() => {
            setTab("execution");
            setFilter("completed");
          }}
        >
          <span>
            <CheckCheck size={16} />
            Published
          </span>
          <strong>
            {published}
            <small> deliverables</small>
          </strong>
          <em className="wf-success">Successfully completed</em>
        </button>
        <button
          className="card wf-stat"
          onClick={() => {
            setTab("execution");
            setFilter("approvals");
          }}
        >
          <span>
            <FileText size={16} />
            Pending approvals
          </span>
          <strong>
            {approvals.length}
            <small> submissions</small>
          </strong>
          <em className={approvals.length ? "wf-warning" : ""}>
            Ready for your review
          </em>
        </button>
        <div className="card wf-stat">
          <span>
            <Wallet size={16} />
            Campaign budget
          </span>
          <strong className="wf-budget">{money(c.budgetPaise)}</strong>
          <em>{followUps.length} payment follow-ups</em>
        </div>
      </div>
      <div className="wf-section-nav">
        <div role="tablist" aria-label="Campaign sections">
          {[
            ["execution", "Execution tracker", Users],
            ["tasks", "Tasks", ListChecks],
            ["activity", "Activity", History],
          ].map(([key, text, Icon]) => {
            const I = Icon as typeof Users;
            return (
              <button
                key={key as string}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key as typeof tab)}
              >
                <I size={15} />
                {text as string}
                {key === "tasks" && (
                  <span>
                    {c.tasks.filter((t) => t.status !== "COMPLETED").length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" onClick={() => setNoteOpen(true)}>
          <MessageSquare size={15} />
          Add internal note
        </Button>
      </div>
      {tab === "execution" && (
        <>
          {(overdueTasks.length > 0 || followUps.length > 0) && (
            <div className="wf-attention">
              <CircleAlert size={17} />
              <span>
                {overdueTasks.length > 0
                  ? `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task" : "tasks"}`
                  : ""}
                {overdueTasks.length > 0 && followUps.length > 0 ? " · " : ""}
                {followUps.length > 0
                  ? `${followUps.length} payments need follow-up`
                  : ""}
              </span>
              <button
                onClick={() => {
                  if (overdueTasks.length) setTab("tasks");
                  else setFilter("payments");
                }}
              >
                Review priorities <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          <div className="card wf-tracker-card">
            <div className="wf-tracker-header">
              <div>
                <h2>Creator execution</h2>
                <p>Track the work, from invitation to publication.</p>
              </div>
              <div className="wf-search">
                <Search size={15} />
                <Input
                  aria-label="Search assigned talent"
                  placeholder="Search creators or tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="wf-filter-row" aria-label="Filter assignments">
              {(
                [
                  ["all", "All creators", c.assignments.length],
                  ["confirmed", "Confirmed", confirmed],
                  ["approvals", "Approvals", approvals.length],
                  ["completed", "Published", published],
                  ["payments", "Payment follow-up", followUps.length],
                ] as const
              ).map(([key, text, count]) => (
                <button
                  key={key}
                  className={
                    filter === key || (key === "all" && filter === "assigned")
                      ? "active"
                      : ""
                  }
                  onClick={() => setFilter(key)}
                >
                  {text}
                  <span>{count}</span>
                </button>
              ))}
              {filter === "overdue" && (
                <button className="active" onClick={() => setTab("tasks")}>
                  Overdue tasks<span>{overdueTasks.length}</span>
                </button>
              )}
            </div>
            {visible.length ? (
              <div className="table-wrap">
                <table className="data-table wf-tracker-table">
                  <thead>
                    <tr>
                      <th>Talent</th>
                      <th>Assigned task</th>
                      <th>Due date</th>
                      <th>Assignment</th>
                      <th>Deliverable</th>
                      <th>Approval</th>
                      <th>Payment</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <button
                            className="wf-person"
                            onClick={() => setEditing(a.id)}
                          >
                            <Avatar name={a.talent.fullName} />
                            <span>
                              <strong>{a.talent.fullName}</strong>
                              <small>
                                {a.talent.category} · {a.talent.city}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className="wf-task-text">{a.task}</span>
                        </td>
                        <td>
                          <span
                            className={
                              new Date(a.dueDate) < new Date() &&
                              a.deliverable?.status !== "PUBLISHED"
                                ? "wf-date-overdue"
                                : ""
                            }
                          >
                            {date(a.dueDate)}
                          </span>
                        </td>
                        <td>
                          <Badge status={a.status} />
                        </td>
                        <td>
                          <Badge
                            status={a.deliverable?.status || "NOT_STARTED"}
                          />
                        </td>
                        <td>
                          <Badge
                            status={
                              a.approval?.status ||
                              (c.approvalRequired
                                ? "NOT_STARTED"
                                : "NOT_REQUIRED")
                            }
                          >
                            {!a.approval && c.approvalRequired
                              ? "Awaiting submission"
                              : undefined}
                          </Badge>
                        </td>
                        <td>
                          <span className="wf-payment">
                            <Badge
                              status={a.payment?.status || "NOT_INVOICED"}
                            />
                            {a.payment?.followUp &&
                              a.payment.status !== "PAID" && (
                                <small>Follow-up needed</small>
                              )}
                          </span>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            className="wf-manage-button"
                            onClick={() => setEditing(a.id)}
                            aria-label={`Manage ${a.talent.fullName}`}
                          >
                            <ArrowUpRight size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No creators in this view"
                description="Try another filter or assign talent to begin."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFilter("all");
                      setSearch("");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
            <div className="wf-table-footer">
              <span>
                {visible.length} of {c.assignments.length} creators
              </span>
              <span>Changes are saved to your workspace</span>
            </div>
          </div>
          {approvals.length > 0 && (
            <section className="card wf-approvals">
              <div className="wf-section-heading">
                <div>
                  <div className="eyebrow">REVIEW DESK</div>
                  <h2>
                    Ready for approval{" "}
                    <span className="wf-count">{approvals.length}</span>
                  </h2>
                  <p>
                    Review each submission before clearing it for publication.
                  </p>
                </div>
                <ShieldCheck size={26} />
              </div>
              <div className="wf-review-grid">
                {approvals.map((a) => (
                  <div className="wf-review-item" key={a.id}>
                    <div className="wf-person">
                      <Avatar name={a.talent.fullName} />
                      <span>
                        <strong>{a.talent.fullName}</strong>
                        <small>{a.task}</small>
                      </span>
                    </div>
                    <a
                      href={a.deliverable?.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wf-submission-link"
                    >
                      View submission <ExternalLink size={13} />
                    </a>
                    <div className="wf-review-actions">
                      <Button
                        variant="secondary"
                        busy={busy === a.id}
                        onClick={() =>
                          void quickUpdate(
                            a,
                            { approvalStatus: "CHANGES_REQUESTED" },
                            "Changes requested",
                          )
                        }
                      >
                        Request changes
                      </Button>
                      <Button
                        busy={busy === a.id}
                        onClick={() =>
                          void quickUpdate(
                            a,
                            { approvalStatus: "APPROVED" },
                            "Submission approved",
                          )
                        }
                      >
                        <Check size={14} />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {tab === "tasks" && (
        <section className="card wf-tasks">
          <div className="wf-section-heading">
            <div>
              <h2>Operational tasks</h2>
              <p>Keep the small details moving.</p>
            </div>
            <Button onClick={() => setTaskOpen(true)}>
              <Plus size={15} />
              Create task
            </Button>
          </div>
          {c.tasks.length ? (
            <div className="wf-task-list">
              {[...c.tasks]
                .sort(
                  (a, b) =>
                    Number(a.status === "COMPLETED") -
                    Number(b.status === "COMPLETED"),
                )
                .map((t) => {
                  const overdue =
                    t.status !== "COMPLETED" &&
                    new Date(t.dueDate) < new Date();
                  const assignment = c.assignments.find(
                    (a) => a.id === t.assignmentId,
                  );
                  return (
                    <div
                      className={`wf-task-row ${t.status === "COMPLETED" ? "is-complete" : ""}`}
                      key={t.id}
                    >
                      <button
                        className={`wf-task-check ${t.status === "COMPLETED" ? "checked" : ""}`}
                        aria-label={`${t.status === "COMPLETED" ? "Reopen" : "Complete"} task ${t.title}`}
                        disabled={busy === t.id}
                        onClick={async () => {
                          setBusy(t.id);
                          try {
                            await mutate(
                              `/api/tasks/${t.id}`,
                              {
                                status:
                                  t.status === "COMPLETED"
                                    ? "OPEN"
                                    : "COMPLETED",
                              },
                              "PATCH",
                            );
                            toast.success(
                              t.status === "COMPLETED"
                                ? "Task reopened"
                                : "Task completed",
                            );
                          } catch {
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        {t.status === "COMPLETED" && <Check size={14} />}
                      </button>
                      <div>
                        <strong>{t.title}</strong>
                        <small>
                          {assignment?.talent.fullName || "Campaign task"}
                        </small>
                      </div>
                      <span className={overdue ? "wf-date-overdue" : "muted"}>
                        <Clock3 size={13} />
                        {date(t.dueDate)}
                        {overdue ? " · Overdue" : ""}
                      </span>
                      <Badge status={t.status} />
                    </div>
                  );
                })}
            </div>
          ) : (
            <Empty
              title="A clean task list"
              description="Create a task to keep your next deadline in view."
              action={
                <Button onClick={() => setTaskOpen(true)}>Create task</Button>
              }
            />
          )}
        </section>
      )}
      {tab === "activity" && (
        <section className="card wf-activity">
          <div className="wf-section-heading">
            <div>
              <h2>Campaign history</h2>
              <p>A clear record of every operational update.</p>
            </div>
            <History size={21} />
          </div>
          {activity.length ? (
            <div className="wf-history-list">
              {activity.map((a) => (
                <div key={a.id} className="wf-history-item">
                  <span className="wf-history-dot" />
                  <div>
                    <p>{a.message}</p>
                    <small>
                      {date(a.createdAt, true)} ·{" "}
                      {new Intl.DateTimeFormat("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      }).format(new Date(a.createdAt))}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Your campaign history starts here"
              description="Assignment, task, approval and note updates will appear here."
            />
          )}
        </section>
      )}
      <div className="wf-footnote">
        <ShieldCheck size={13} /> Demo workspace · Payment statuses are records
        only. Messages and payments are never sent automatically.
      </div>
      <CampaignDetailsDialog
        open={detailsOpen}
        setOpen={setDetailsOpen}
        campaign={c}
      />
      <AssignDialog open={assignOpen} setOpen={setAssignOpen} campaign={c} />
      <TaskDialog open={taskOpen} setOpen={setTaskOpen} campaign={c} />
      <NoteDialog open={noteOpen} setOpen={setNoteOpen} campaign={c} />
      {activeAssignment && (
        <AssignmentDialog
          key={activeAssignment.id}
          assignment={activeAssignment}
          campaign={c}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AssignDialog({
  open,
  setOpen,
  campaign,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  campaign: Campaign;
}) {
  const { data, mutate } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const available = (data?.talent || []).filter(
    (t) => !campaign.assignments.some((a) => a.talentId === t.id),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await mutate(`/api/campaigns/${campaign.id}/assignments`, {
        talentId: f.get("talentId"),
        task: f.get("task"),
        dueDate: isoDeadline(String(f.get("dueDate"))),
      });
      toast.success("Talent assigned to campaign");
      setOpen(false);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Assign talent"
      description="Invite a creator into this campaign’s execution workflow."
    >
      <form onSubmit={submit} className="wf-dialog-form">
        <Field label="Talent">
          <select className="input" name="talentId" required defaultValue="">
            <option value="" disabled>
              Select a talent profile
            </option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName} · {t.category} · {t.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigned deliverable">
          <Input
            name="task"
            required
            maxLength={300}
            defaultValue={campaign.deliverableBrief || "1 Instagram reel"}
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            name="dueDate"
            required
            defaultValue={dateInput(campaign.endDate)}
          />
        </Field>
        <p className="wf-form-note">
          New assignments start as invited. Confirm the creator before
          submitting work.
        </p>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button busy={busy} disabled={!available.length}>
            Assign talent
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function TaskDialog({
  open,
  setOpen,
  campaign,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  campaign: Campaign;
}) {
  const { mutate } = useWorkspace();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await mutate(`/api/campaigns/${campaign.id}/tasks`, {
        title: f.get("title"),
        dueDate: isoDeadline(String(f.get("dueDate"))),
        ...(f.get("assignmentId")
          ? { assignmentId: f.get("assignmentId") }
          : {}),
      });
      toast.success("Task created");
      setOpen(false);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Create operational task"
      description="Give the next step a clear owner and deadline."
    >
      <form onSubmit={submit} className="wf-dialog-form">
        <Field label="Task">
          <Input
            name="title"
            required
            maxLength={300}
            placeholder="e.g. Follow up on revised reel"
          />
        </Field>
        <Field label="Related creator (optional)">
          <select name="assignmentId" className="input">
            <option value="">Campaign-level task</option>
            {campaign.assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.talent.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            name="dueDate"
            required
            defaultValue={todayInput()}
          />
        </Field>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button busy={busy}>Create task</Button>
        </div>
      </form>
    </Modal>
  );
}
function NoteDialog({
  open,
  setOpen,
  campaign,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  campaign: Campaign;
}) {
  const { mutate } = useWorkspace();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await mutate(`/api/campaigns/${campaign.id}/notes`, {
        note: f.get("note"),
      });
      toast.success("Internal note added to campaign history");
      setOpen(false);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Add internal note"
      description="Keep context with the campaign. This note stays inside your workspace."
    >
      <form onSubmit={submit} className="wf-dialog-form">
        <Field label="Note">
          <textarea
            className="input wf-textarea"
            name="note"
            required
            maxLength={2000}
            placeholder="Add an update, decision or context for your team…"
          />
        </Field>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button busy={busy}>Save note</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignmentDialog({
  assignment: a,
  campaign,
  onClose,
}: {
  assignment: Assignment;
  campaign: Campaign;
  onClose: () => void;
}) {
  const { mutate } = useWorkspace();
  const [busy, setBusy] = useState<string | null>(null);
  const [url, setUrl] = useState(a.deliverable?.url || "");
  const [followUp, setFollowUp] = useState(a.payment?.followUp || false);
  const [paymentStatus, setPaymentStatus] = useState(
    a.payment?.status || "NOT_INVOICED",
  );
  const current = a.deliverable?.status || "NOT_STARTED";
  const deliverableOptions = [
    current,
    ...(a.status === "CONFIRMED"
      ? current === "NOT_STARTED"
        ? ["IN_PROGRESS", "SUBMITTED"]
        : current === "IN_PROGRESS"
          ? ["SUBMITTED"]
          : current === "SUBMITTED" && !campaign.approvalRequired
            ? ["PUBLISHED"]
            : current === "APPROVED"
              ? ["PUBLISHED"]
              : []
      : []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  const assignmentOptions = [
    a.status,
    ...(a.status === "INVITED"
      ? ["CONFIRMED", "DECLINED", "CANCELLED"]
      : a.status === "CONFIRMED" &&
          ["NOT_STARTED", "IN_PROGRESS"].includes(current)
        ? ["CANCELLED"]
        : ["DECLINED", "CANCELLED"].includes(a.status)
          ? ["INVITED"]
          : []),
  ];
  async function update(part: string, body: unknown, message: string) {
    setBusy(part);
    try {
      await mutate(`/api/assignments/${a.id}`, body, "PATCH");
      toast.success(message);
    } catch {
    } finally {
      setBusy(null);
    }
  }
  async function saveAssignment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await update(
      "assignment",
      {
        task: f.get("task"),
        dueDate: isoDeadline(String(f.get("dueDate"))),
        status: f.get("status"),
      },
      "Assignment updated",
    );
  }
  async function saveDeliverable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await update(
      "deliverable",
      {
        ...(url ? { url } : {}),
        deliverableStatus: f.get("deliverableStatus"),
      },
      "Deliverable updated",
    );
  }
  async function savePayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await update(
      "payment",
      {
        amountPaise: Math.round(Number(f.get("amount")) * 100),
        paymentStatus,
        followUp: paymentStatus === "PAID" ? false : followUp,
      },
      "Payment record updated",
    );
  }
  return (
    <Modal
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={a.talent.fullName}
      description={`${a.talent.category} · ${campaign.name}`}
      wide
    >
      <div className="wf-assignment-banner">
        <Avatar name={a.talent.fullName} />
        <div>
          <strong>{a.talent.fullName}</strong>
          <span>{a.talent.email}</span>
        </div>
        <Badge status={a.status} />
      </div>
      <div className="wf-manage-grid">
        <form className="wf-manage-panel" onSubmit={saveAssignment}>
          <div className="wf-panel-title">
            <Users size={16} />
            <h3>Assignment</h3>
          </div>
          <Field label="Assigned task">
            <Input name="task" defaultValue={a.task} required maxLength={300} />
          </Field>
          <div className="form-grid">
            <Field label="Due date">
              <Input
                type="date"
                name="dueDate"
                defaultValue={dateInput(a.dueDate)}
                required
              />
            </Field>
            <Field label="Assignment status">
              <select className="input" name="status" defaultValue={a.status}>
                {assignmentOptions.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button variant="secondary" busy={busy === "assignment"}>
            Save assignment
          </Button>
        </form>
        <form className="wf-manage-panel" onSubmit={saveDeliverable}>
          <div className="wf-panel-title">
            <FileText size={16} />
            <h3>Deliverable</h3>
          </div>
          <Field
            label="Submission URL"
            hint="Use a publicly accessible HTTP or HTTPS review link."
          >
            <Input
              type="url"
              name="url"
              readOnly={["APPROVED", "PUBLISHED"].includes(current)}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://portfolio.example/reel"
              maxLength={2000}
            />
          </Field>
          <Field label="Deliverable status">
            <select
              className="input"
              name="deliverableStatus"
              defaultValue={current}
              key={current}
            >
              {deliverableOptions.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
          {a.status !== "CONFIRMED" && (
            <p className="wf-form-note">
              Confirm the assignment to start or submit work.
            </p>
          )}
          {campaign.approvalRequired && current === "SUBMITTED" && (
            <p className="wf-form-note">
              Review this submission below before publishing.
            </p>
          )}
          <Button
            variant="secondary"
            busy={busy === "deliverable"}
            disabled={a.status !== "CONFIRMED" || current === "PUBLISHED"}
          >
            Save deliverable
          </Button>
        </form>
        <div className="wf-manage-panel">
          <div className="wf-panel-title">
            <ShieldCheck size={16} />
            <h3>Content approval</h3>
          </div>
          <Badge
            status={
              a.approval?.status ||
              (campaign.approvalRequired ? "NOT_STARTED" : "NOT_REQUIRED")
            }
          >
            {!a.approval && campaign.approvalRequired
              ? "Awaiting submission"
              : undefined}
          </Badge>
          <p className="wf-form-note">
            {campaign.approvalRequired
              ? "A human review is required before this deliverable can be published."
              : "This campaign does not require a separate content approval."}
          </p>
          {a.deliverable?.url && (
            <a
              className="wf-submission-link"
              href={a.deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open submitted content <ExternalLink size={13} />
            </a>
          )}
          {a.approval?.status === "PENDING" ? (
            <div className="wf-review-actions">
              <Button
                variant="secondary"
                busy={busy === "approval"}
                onClick={() =>
                  void update(
                    "approval",
                    { approvalStatus: "CHANGES_REQUESTED" },
                    "Changes requested",
                  )
                }
              >
                Request changes
              </Button>
              <Button
                busy={busy === "approval"}
                onClick={() =>
                  void update(
                    "approval",
                    { approvalStatus: "APPROVED" },
                    "Content approved",
                  )
                }
              >
                <Check size={14} />
                Approve
              </Button>
            </div>
          ) : (
            <div className="wf-approval-note">
              {a.approval?.status === "APPROVED" ? (
                <>
                  <CheckCheck size={16} /> Approved for publication
                </>
              ) : a.approval?.status === "CHANGES_REQUESTED" ? (
                <>
                  <CircleAlert size={16} /> Awaiting a revised submission
                </>
              ) : (
                <>
                  <Clock3 size={16} /> No review action needed yet
                </>
              )}
            </div>
          )}
        </div>
        <form className="wf-manage-panel" onSubmit={savePayment}>
          <div className="wf-panel-title">
            <Wallet size={16} />
            <h3>Payment record</h3>
          </div>
          <div className="form-grid">
            <Field label="Invoice amount (₹)">
              <Input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                max="21474836.47"
                required
                defaultValue={(a.payment?.amountPaise || 0) / 100}
              />
            </Field>
            <Field label="Payment status">
              <select
                className="input"
                name="paymentStatus"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                {["NOT_INVOICED", "PENDING", "PAID"].map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="wf-checkbox">
            <input
              type="checkbox"
              checked={paymentStatus !== "PAID" && followUp}
              disabled={paymentStatus === "PAID"}
              onChange={(e) => setFollowUp(e.target.checked)}
            />{" "}
            Mark follow-up needed
          </label>
          <p className="wf-form-note">
            Records tracking only. No payment is initiated.
          </p>
          <Button variant="secondary" busy={busy === "payment"}>
            Save payment record
          </Button>
        </form>
      </div>
      <div className="form-actions">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

function CampaignDetailsDialog({
  open,
  setOpen,
  campaign: c,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  campaign: Campaign;
}) {
  const { mutate } = useWorkspace();
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [archive, setArchive] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await mutate(
        `/api/campaigns/${c.id}`,
        {
          name: f.get("name"),
          brandName: f.get("brandName"),
          budgetPaise: Math.round(Number(f.get("budget")) * 100),
          startDate: `${f.get("startDate")}T00:00:00.000+05:30`,
          endDate: isoDeadline(String(f.get("endDate"))),
          manager: f.get("manager"),
          status: f.get("status"),
          objective: f.get("objective"),
          deliverableBrief: f.get("deliverableBrief"),
          requiredCategory: f.get("requiredCategory"),
          creatorCount: Number(f.get("creatorCount")),
        },
        "PATCH",
      );
      toast.success("Campaign details updated");
      setOpen(false);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function archiveCampaign() {
    setBusy(true);
    try {
      await mutate(`/api/campaigns/${c.id}`, undefined, "DELETE");
      toast.success("Campaign archived. History has been retained.");
      setArchive(false);
      setOpen(false);
      router.push("/campaigns");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Edit campaign"
        description="Keep campaign details and operational expectations aligned."
        wide
      >
        <form onSubmit={save} className="wf-dialog-form">
          <div className="form-grid">
            <Field label="Campaign name">
              <Input
                name="name"
                required
                minLength={2}
                maxLength={200}
                defaultValue={c.name}
              />
            </Field>
            <Field label="Brand">
              <Input
                name="brandName"
                required
                maxLength={150}
                defaultValue={c.brand.name}
              />
            </Field>
            <Field label="Budget (₹)">
              <Input
                name="budget"
                type="number"
                min="0"
                max="21474836.47"
                step="0.01"
                required
                defaultValue={c.budgetPaise / 100}
              />
            </Field>
            <Field label="Campaign manager">
              <Input
                name="manager"
                required
                maxLength={120}
                defaultValue={c.manager}
              />
            </Field>
            <Field label="Start date">
              <Input
                name="startDate"
                type="date"
                required
                defaultValue={dateInput(c.startDate)}
              />
            </Field>
            <Field label="End date">
              <Input
                name="endDate"
                type="date"
                required
                defaultValue={dateInput(c.endDate)}
              />
            </Field>
            <Field label="Status">
              <select className="input" name="status" defaultValue={c.status}>
                {["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Planned creators">
              <Input
                name="creatorCount"
                type="number"
                min="1"
                max="10000"
                required
                defaultValue={c.creatorCount}
              />
            </Field>
            <Field label="Required talent category">
              <Input
                name="requiredCategory"
                maxLength={100}
                required
                defaultValue={c.requiredCategory}
              />
            </Field>
            <Field label="Deliverable brief">
              <Input
                name="deliverableBrief"
                maxLength={2000}
                required
                defaultValue={c.deliverableBrief}
              />
            </Field>
          </div>
          <Field label="Campaign objective">
            <textarea
              name="objective"
              className="input wf-textarea"
              maxLength={3000}
              defaultValue={c.objective}
            />
          </Field>
          <p className="wf-form-note">
            {c.approvalRequired
              ? "Brand approval is required before publication."
              : "This campaign does not require separate brand approval."}{" "}
            Approval requirements stay fixed once talent is assigned.
          </p>
          <div className="wf-edit-actions">
            <Button
              type="button"
              variant="danger"
              onClick={() => setArchive(true)}
            >
              Archive campaign
            </Button>
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button busy={busy}>Save campaign</Button>
            </div>
          </div>
        </form>
      </Modal>
      <Modal
        open={archive}
        onOpenChange={setArchive}
        title="Archive this campaign?"
        description="This campaign will leave your active workspace. Talent assignments, payment records and activity history are retained in the database."
      >
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setArchive(false)}>
            Keep campaign
          </Button>
          <Button
            variant="danger"
            busy={busy}
            onClick={() => void archiveCampaign()}
          >
            Archive campaign
          </Button>
        </div>
      </Modal>
    </>
  );
}
