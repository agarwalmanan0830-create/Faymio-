"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  FileText,
  FolderOpen,
  Info,
  Save,
  Sparkles,
  PenLine,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useWorkspace, WorkspaceState } from "@/components/workspace-provider";
import type { Brief } from "@/types";
import { date } from "@/lib/utils";
import "@/components/briefs/briefs.css";
const example =
  "GlowLab Skincare is launching a new vitamin C serum. We need 20 beauty and lifestyle creators. Budget ₹2,00,000. Campaign duration 15 days. Each creator should publish one Instagram reel. Brand approval is required before publishing.";
const blank: Brief = {
  brandName: "",
  campaignName: "",
  objective: "",
  budgetPaise: 0,
  requiredCategory: "Creator",
  creatorCount: 0,
  deliverables: "",
  approvalRequired: true,
  durationDays: 15,
  startDate: "",
  missingInformation: [],
};
type Draft = {
  id: string;
  content: string;
  structuredJson: string;
  updatedAt: string;
};
function draftTitle(draft: Draft) {
  try {
    return JSON.parse(draft.structuredJson).campaignName || "Untitled campaign";
  } catch {
    return "Unreadable draft";
  }
}
export default function BriefsPage() {
  const { data, mutate } = useWorkspace();
  const router = useRouter();
  const [text, setText] = useState(""),
    [brief, setBrief] = useState<Brief | null>(null),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [mode, setMode] = useState<"demo" | "live" | "manual">("demo"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [draftOpen, setDraftOpen] = useState(false);
  useEffect(() => {
    fetch("/api/briefs")
      .then((r) => (r.ok ? r.json() : []))
      .then(setDrafts)
      .catch(() => {});
  }, []);
  const update = <K extends keyof Brief>(key: K, value: Brief[K]) => {
    const warning: Partial<Record<keyof Brief, string>> = {
      brandName: "Brand name",
      budgetPaise: "Confirmed campaign budget",
      creatorCount: "Number of creators",
      durationDays: "Campaign duration",
      startDate: "Campaign start date",
      deliverables: "Deliverable specifications",
    };
    setBrief((previous) =>
      previous
        ? {
            ...previous,
            [key]: value,
            missingInformation:
              value && warning[key]
                ? previous.missingInformation.filter(
                    (item) => item !== warning[key],
                  )
                : previous.missingInformation,
          }
        : previous,
    );
    setReviewed(false);
    setError("");
  };
  async function extract() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || "Could not process the brief");
      setBrief(result.brief);
      setMode(result.mode);
      setNotice(result.notice || "");
      setReviewed(false);
      toast.success(
        "Brief structured. Review the details before creating a campaign.",
      );
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveDraft() {
    if (!brief) return;
    setSaving(true);
    try {
      const draft = await mutate("/api/briefs", { content: text, brief });
      setDrafts((previous) => [draft, ...previous]);
      toast.success("Draft saved to your workspace");
    } catch {
    } finally {
      setSaving(false);
    }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!brief) return;
    if (!reviewed) {
      setError("Please review and confirm the campaign details.");
      return;
    }
    if (
      !brief.startDate ||
      brief.creatorCount < 1 ||
      brief.budgetPaise <= 0 ||
      brief.durationDays < 1
    ) {
      setError(
        "Add a start date, creator count, campaign budget, and duration before continuing.",
      );
      return;
    }
    setSaving(true);
    try {
      const endDate = new Date(`${brief.startDate}T12:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + brief.durationDays - 1);
      const created = await mutate("/api/campaigns", {
        brandName: brief.brandName,
        name: brief.campaignName,
        budgetPaise: brief.budgetPaise,
        startDate: new Date(`${brief.startDate}T00:00:00.000Z`).toISOString(),
        endDate: endDate.toISOString(),
        manager: data?.user.name || "Demo manager",
        status: "DRAFT",
        objective: brief.objective,
        requiredCategory: brief.requiredCategory,
        creatorCount: brief.creatorCount,
        deliverableBrief: brief.deliverables,
        approvalRequired: brief.approvalRequired,
      });
      toast.success("Campaign created. Your tracker is ready.");
      router.push(`/campaigns/${created.id}`);
    } catch {
    } finally {
      setSaving(false);
    }
  }
  return (
    <WorkspaceState>
      <div className="page briefs-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">A LITTLE STRUCTURE. A FASTER START.</div>
            <h1>
              AI Brief Assistant<span className="title-dot">.</span>
            </h1>
            <p>Turn a brand’s big idea into a clear plan of action.</p>
          </div>
          <Button variant="secondary" onClick={() => setDraftOpen(true)}>
            <FolderOpen size={16} />
            Saved drafts{" "}
            {drafts.length > 0 && (
              <span className="brief-count">{drafts.length}</span>
            )}
          </Button>
        </div>
        <div className="brief-steps">
          <div className="step active">
            <span>1</span> Add your brief
          </div>
          <i />
          <div className={`step ${brief ? "active" : ""}`}>
            <span>2</span> Review the details
          </div>
          <i />
          <div className={`step ${reviewed ? "active" : ""}`}>
            <span>3</span> Create campaign
          </div>
        </div>
        <div className="brief-layout">
          <section className="card brief-source">
            <div className="brief-section-top">
              <span className="surface-icon">
                <FileText size={20} />
              </span>
              <span className="mode-chip">
                {data?.aiMode === "live"
                  ? "AI provider configured"
                  : "Demo AI mode"}
              </span>
            </div>
            <h2>Start with the brief.</h2>
            <p className="muted">
              Paste an email, a campaign idea, or a few lines from your client.
              We’ll help organize the essentials.
            </p>
            <label className="sr-only" htmlFor="brand-brief">
              Brand brief
            </label>
            <textarea
              id="brand-brief"
              className="brief-textarea"
              placeholder="Tell us what the brand is planning…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={12000}
            />
            <div className="brief-input-meta">
              <span>
                {text.length.toLocaleString("en-IN")} / 12,000 characters
              </span>
              <button
                className="text-button"
                onClick={() => {
                  setText(example);
                  setError("");
                }}
              >
                Try a sample brief <ArrowUpRight size={13} />
              </button>
            </div>
            <Button
              className="brief-extract"
              busy={busy}
              disabled={text.trim().length < 30}
              onClick={() => void extract()}
            >
              <Sparkles size={16} />
              {busy
                ? "Structuring your brief…"
                : brief
                  ? "Regenerate structure"
                  : "Structure this brief"}
              {!busy && <ArrowRight size={16} />}
            </Button>
            <button
              className="brief-manual text-button"
              onClick={() => {
                setBrief({ ...blank });
                setMode("manual");
                setReviewed(false);
                setError("");
              }}
            >
              <PenLine size={14} />
              Start with manual entry
            </button>
            <div className="brief-privacy">
              <Info size={16} />
              <span>
                {data?.aiMode === "live"
                  ? "Live extraction uses the configured provider. Only your supplied brief is sent."
                  : "Demo mode uses deterministic parsing. No live model is called."}{" "}
                You always review before anything is saved as a campaign.
              </span>
            </div>
          </section>
          <section className="card brief-review">
            {!brief ? (
              <div className="brief-placeholder">
                <div className="brief-preview-art">
                  <div className="preview-line purple" />
                  <div className="preview-line" />
                  <div className="preview-pair">
                    <span />
                    <span />
                  </div>
                  <div className="preview-line short" />
                  <div className="preview-check">
                    <Check size={16} />
                  </div>
                </div>
                <span className="eyebrow">A CLEARER WAY TO BEGIN</span>
                <h2>Your campaign, organized.</h2>
                <p>
                  Brand, budget, talent, deliverables, and timing —<br />
                  ready for your review in one place.
                </p>
                <div className="brief-placeholder-pills">
                  <span>
                    <Check size={12} />
                    Editable details
                  </span>
                  <span>
                    <Check size={12} />
                    Human approved
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={create}>
                <div className="brief-review-heading">
                  <div>
                    <span className="eyebrow">STEP 02 / MAKE IT YOURS</span>
                    <h2>Review campaign details</h2>
                  </div>
                  <span className="mode-chip">
                    {mode === "manual"
                      ? "Manual entry"
                      : mode === "live"
                        ? "Live AI extraction"
                        : "Demo AI extraction"}
                  </span>
                </div>
                {notice && (
                  <div className="brief-warning">
                    <Info size={16} />
                    {notice}
                  </div>
                )}
                {brief.missingInformation.length > 0 && (
                  <details className="brief-warning">
                    <summary>
                      <TriangleAlert size={15} />
                      {brief.missingInformation.length} details need your
                      attention
                    </summary>
                    <p>
                      {brief.missingInformation.join(" · ")}. Confirm these with
                      your client before kickoff.
                    </p>
                  </details>
                )}
                <div className="form-grid">
                  <Field label="Brand name">
                    <Input
                      required
                      maxLength={150}
                      value={brief.brandName}
                      onChange={(e) => update("brandName", e.target.value)}
                    />
                  </Field>
                  <Field label="Campaign name">
                    <Input
                      required
                      maxLength={180}
                      value={brief.campaignName}
                      onChange={(e) => update("campaignName", e.target.value)}
                    />
                  </Field>
                  <Field label="Campaign budget (₹)">
                    <Input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      max="21474836.47"
                      value={brief.budgetPaise ? brief.budgetPaise / 100 : ""}
                      placeholder="2,00,000"
                      onChange={(e) =>
                        update(
                          "budgetPaise",
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </Field>
                  <Field label="Number of creators">
                    <Input
                      required
                      type="number"
                      min="1"
                      max="10000"
                      value={brief.creatorCount || ""}
                      onChange={(e) =>
                        update("creatorCount", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Talent / content category">
                    <Input
                      required
                      value={brief.requiredCategory}
                      maxLength={100}
                      onChange={(e) =>
                        update("requiredCategory", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Duration (days)">
                    <Input
                      required
                      type="number"
                      min="1"
                      max="730"
                      value={brief.durationDays || ""}
                      onChange={(e) =>
                        update("durationDays", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Start date">
                    <Input
                      required
                      type="date"
                      value={brief.startDate}
                      onChange={(e) => update("startDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Approval workflow">
                    <select
                      className="input"
                      value={
                        brief.approvalRequired ? "required" : "not-required"
                      }
                      onChange={(e) =>
                        update(
                          "approvalRequired",
                          e.target.value === "required",
                        )
                      }
                    >
                      <option value="required">Brand approval required</option>
                      <option value="not-required">
                        Approval not required
                      </option>
                    </select>
                  </Field>
                </div>
                <Field label="Campaign objective">
                  <textarea
                    required
                    className="input brief-small-area"
                    maxLength={3000}
                    value={brief.objective}
                    onChange={(e) => update("objective", e.target.value)}
                  />
                </Field>
                <Field label="Deliverables">
                  <textarea
                    required
                    className="input brief-small-area"
                    maxLength={2000}
                    value={brief.deliverables}
                    placeholder="One Instagram reel per creator…"
                    onChange={(e) => update("deliverables", e.target.value)}
                  />
                </Field>
                <label className="review-confirm">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>
                    I’ve reviewed these details and confirm this campaign can be
                    created.
                  </span>
                  <CheckCheck size={19} />
                </label>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="form-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    busy={saving}
                    onClick={() => void saveDraft()}
                  >
                    <Save size={15} />
                    Save draft
                  </Button>
                  <Button type="submit" busy={saving} disabled={!reviewed}>
                    Create campaign
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
        {error && !brief && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="brief-bottom-note">
          <Sparkles size={15} />
          <span>Less admin. More momentum.</span>
          <span className="muted">
            Structured support, with you in control.
          </span>
        </div>
        <Modal
          open={draftOpen}
          onOpenChange={setDraftOpen}
          title="Saved brief drafts"
          description="Pick up where you left off. Drafts have not been created as campaigns."
        >
          <div className="brief-draft-list">
            {drafts.length ? (
              drafts.map((d) => (
                <button
                  key={d.id}
                  className="brief-draft"
                  onClick={() => {
                    try {
                      setBrief(JSON.parse(d.structuredJson));
                      setText(d.content);
                      setMode("manual");
                      setReviewed(false);
                      setDraftOpen(false);
                    } catch {
                      toast.error("This draft could not be opened");
                    }
                  }}
                >
                  <FileText size={20} />
                  <span>
                    <strong>{draftTitle(d)}</strong>
                    <small>Saved {date(d.updatedAt, true)}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))
            ) : (
              <div className="empty">
                <FileText size={30} />
                <h3>No drafts yet</h3>
                <p>Structure a brief and save it to continue later.</p>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </WorkspaceState>
  );
}
