"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Database,
  FileText,
  Layers3,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, Button } from "@/components/ui";
import { useWorkspace, WorkspaceState } from "@/components/workspace-provider";
import { metrics } from "@/lib/metrics";
import type { AssistantAnswer } from "@/lib/ai/operations";
import "@/components/assistant/assistant.css";
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: AssistantAnswer;
};
const starters = [
  {
    icon: ClipboardCheck,
    title: "Clear the approval queue",
    question: "Show pending approvals.",
    caption: "Find content waiting for a decision",
  },
  {
    icon: Clock3,
    title: "Keep campaigns moving",
    question: "Which creators are delaying the skincare campaign?",
    caption: "See overdue tasks and who owns them",
  },
  {
    icon: FileText,
    title: "Prepare a brand update",
    question: "Prepare a summary for the brand.",
    caption: "Turn live campaign data into a clear update",
  },
  {
    icon: Wallet,
    title: "Follow up on payments",
    question: "Which payments need follow-up?",
    caption: "Review outstanding payment records",
  },
];
export default function AssistantPage() {
  const { data } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setInput(q);
  }, []);
  useEffect(() => {
    if (messages.length)
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);
  async function ask(question: string) {
    if (busy || question.trim().length < 3) return;
    const text = question.trim();
    setInput("");
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    setBusy(true);
    try {
      const r = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const answer = await r.json();
      if (!r.ok) throw Error(answer.error || "The assistant is unavailable");
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: answer.text,
          answer,
        },
      ]);
    } catch (e) {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `I couldn’t retrieve the workspace records. ${(e as Error).message} Please try again.`,
        },
      ]);
    } finally {
      setBusy(false);
      textarea.current?.focus();
    }
  }
  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("Copied. Review before sharing.");
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      toast.error(
        "Clipboard access is unavailable. Select and copy the text directly.",
      );
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }
  const stats = metrics(data?.campaigns || []);
  return (
    <WorkspaceState>
      <div className="page assistant-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR WORKSPACE. A CLEARER PICTURE.</div>
            <h1>
              Operations Copilot<span className="title-dot">.</span>
            </h1>
            <p>A little clarity for everything you’re moving forward.</p>
          </div>
          <Button
            variant="secondary"
            disabled={!messages.length || busy}
            onClick={() => {
              setMessages([]);
              setInput("");
              textarea.current?.focus();
            }}
          >
            <MessageSquarePlus size={15} />
            New conversation
          </Button>
        </div>
        <div className="copilot-layout">
          <section className="card copilot-conversation">
            <div className="copilot-topbar">
              <div>
                <span className="copilot-orb">
                  <Sparkles size={15} />
                </span>
                <strong>Faymio Assistant</strong>
                <span className="copilot-online-dot" />
                <span className="muted">Workspace connected</span>
              </div>
              <span className="copilot-mode">
                {data?.aiMode === "live" ? "Database grounded" : "Demo AI mode"}
              </span>
            </div>
            <div
              className={`copilot-thread ${messages.length ? "has-messages" : ""}`}
              aria-live="polite"
            >
              {!messages.length ? (
                <div className="copilot-welcome">
                  <div className="copilot-welcome-symbol">
                    <Sparkles size={26} />
                    <span />
                  </div>
                  <div className="eyebrow">A GOOD DAY STARTS WITH CLARITY</div>
                  <h2>
                    What’s moving.
                    <br />
                    <span>What needs you.</span>
                  </h2>
                  <p>
                    Ask about your campaigns, spot the blockers,
                    <br />
                    and make room for the work that matters.
                  </p>
                  <div className="copilot-starters">
                    {starters.map((s) => (
                      <button
                        key={s.title}
                        onClick={() => void ask(s.question)}
                      >
                        <span className="starter-icon">
                          <s.icon size={18} />
                        </span>
                        <div>
                          <strong>{s.title}</strong>
                          <small>{s.caption}</small>
                        </div>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`copilot-message ${message.role}`}
                  >
                    <div className="message-avatar">
                      {message.role === "assistant" ? (
                        <span className="copilot-orb">
                          <Sparkles size={15} />
                        </span>
                      ) : (
                        <Avatar
                          name={data?.user.name || "Demo manager"}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="message-content">
                      <div className="message-byline">
                        <strong>
                          {message.role === "assistant"
                            ? "Faymio"
                            : data?.user.name || "You"}
                        </strong>
                        {message.answer && (
                          <span>
                            {message.answer.mode === "live"
                              ? "AI-routed · database answer"
                              : "Demo mode · database answer"}
                          </span>
                        )}
                      </div>
                      <p className="message-text">{message.text}</p>
                      {message.answer?.notice && (
                        <p className="copilot-provider-notice">
                          {message.answer.notice}
                        </p>
                      )}
                      {message.answer?.records.length ? (
                        <div className="answer-records">
                          {message.answer.records.slice(0, 20).map((record) => (
                            <Link
                              href={`/campaigns/${record.campaignId}`}
                              key={record.id}
                              className="answer-record"
                            >
                              <span>
                                <strong>{record.name}</strong>
                                <small>{record.detail}</small>
                                <em>{record.campaignName}</em>
                              </span>
                              <ChevronRight size={15} />
                            </Link>
                          ))}
                          {message.answer.records.length > 20 && (
                            <p className="muted">
                              Showing 20 of {message.answer.records.length}{" "}
                              records. Open a campaign to see the full tracker.
                            </p>
                          )}
                        </div>
                      ) : null}
                      {message.answer?.draft && (
                        <div className="answer-draft">
                          <div>
                            <span>
                              <FileText size={14} />
                              Draft · review before sharing
                            </span>
                            <button
                              className="text-button"
                              onClick={() =>
                                void copy(message.answer!.draft!, message.id)
                              }
                            >
                              {copied === message.id ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                              Copy draft
                            </button>
                          </div>
                          <pre>{message.answer.draft}</pre>
                        </div>
                      )}
                      {message.answer?.campaigns.length ? (
                        <div className="answer-campaigns">
                          {message.answer.campaigns.map((c) => (
                            <Link key={c.id} href={`/campaigns/${c.id}`}>
                              <Layers3 size={12} />
                              {c.name}
                              <ArrowUpRight size={12} />
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      {message.answer?.suggestions && (
                        <div className="answer-suggestions">
                          {message.answer.suggestions.map((s) => (
                            <button
                              key={s}
                              disabled={busy}
                              onClick={() => void ask(s)}
                            >
                              {s}
                              <ArrowRight size={12} />
                            </button>
                          ))}
                        </div>
                      )}
                      {message.role === "assistant" && (
                        <button
                          className="copy-answer"
                          aria-label="Copy assistant response"
                          onClick={() =>
                            void copy(message.text, `text-${message.id}`)
                          }
                        >
                          {copied === `text-${message.id}` ? (
                            <Check size={13} />
                          ) : (
                            <Copy size={13} />
                          )}
                          Copy response
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {busy && (
                <div className="copilot-message assistant">
                  <span className="copilot-orb">
                    <Sparkles size={15} />
                  </span>
                  <div className="thinking">
                    <span />
                    <span />
                    <span />
                    <small>Checking workspace records…</small>
                  </div>
                </div>
              )}
              <div ref={bottom} />
            </div>
            <div className="copilot-composer-wrap">
              <form className="copilot-composer" onSubmit={submit}>
                <label htmlFor="copilot-question" className="sr-only">
                  Ask your operations assistant
                </label>
                <textarea
                  id="copilot-question"
                  ref={textarea}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask(input);
                    }
                  }}
                  placeholder="Ask about your campaigns, approvals, or next steps…"
                  rows={2}
                  maxLength={2000}
                  disabled={busy}
                />
                <div>
                  <span>
                    <Database size={12} />
                    Answers grounded in your workspace
                  </span>
                  <button
                    type="submit"
                    disabled={busy || input.trim().length < 3}
                    aria-label="Send question"
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                </div>
              </form>
              <p>
                {data?.aiMode === "live"
                  ? "Supported questions use database queries. AI may route other requests."
                  : "Demo mode supports the operational questions shown above."}{" "}
                Review drafts before sharing. Nothing is sent automatically.
              </p>
            </div>
          </section>
          <aside className="copilot-sidebar">
            <section className="card copilot-snapshot">
              <span className="eyebrow">WORKSPACE SNAPSHOT</span>
              <div className="snapshot-date">
                <span className="copilot-online-dot" />
                From your stored records
              </div>
              <div className="snapshot-row">
                <span className="snapshot-icon purple">
                  <Layers3 size={17} />
                </span>
                <span>Active campaigns</span>
                <strong>{stats.active}</strong>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-icon amber">
                  <ClipboardCheck size={17} />
                </span>
                <span>Pending approvals</span>
                <strong>{stats.approvals}</strong>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-icon red">
                  <Clock3 size={17} />
                </span>
                <span>Overdue tasks</span>
                <strong>{stats.overdue}</strong>
              </div>
              <div className="snapshot-row">
                <span className="snapshot-icon green">
                  <Wallet size={17} />
                </span>
                <span>Payment follow-ups</span>
                <strong>{stats.payments}</strong>
              </div>
              <button
                className="snapshot-link"
                onClick={() =>
                  void ask("Summarize this week’s campaign progress")
                }
                disabled={busy}
              >
                Get a workspace summary
                <ArrowUpRight size={14} />
              </button>
            </section>
            <section className="copilot-capabilities">
              <span className="eyebrow">A THOUGHTFUL EXTRA PAIR OF HANDS</span>
              <h3>
                Support for the
                <br />
                day-to-day.
              </h3>
              <p>
                Find what needs attention, prepare a client update, or draft a
                thoughtful follow-up.
              </p>
              <ul>
                <li>
                  <Check size={13} />
                  Uses actual campaign records
                </li>
                <li>
                  <Check size={13} />
                  Keeps you in control
                </li>
                <li>
                  <Check size={13} />
                  Never sends or pays automatically
                </li>
              </ul>
              <div>
                <Database size={16} />
                <span>
                  Fictional sample records.
                  <br />
                  All data in this workspace is demo data.
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </WorkspaceState>
  );
}
