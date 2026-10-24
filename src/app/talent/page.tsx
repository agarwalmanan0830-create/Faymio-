"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Edit3,
  Mail,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  Badge,
  Button,
  Confirm,
  Empty,
  Field,
  Input,
  Modal,
} from "@/components/ui";
import { useWorkspace, WorkspaceState } from "@/components/workspace-provider";
import { date, label, money } from "@/lib/utils";
import type { Talent } from "@/types";
import "@/components/talent/talent.css";

const CATEGORIES = ["Influencer", "Model", "Actor", "UGC creator"];
const AVAILABILITY = ["AVAILABLE", "BUSY", "UNAVAILABLE"];
type TalentForm = {
  fullName: string;
  category: string;
  email: string;
  phone: string;
  city: string;
  links: string;
  contentCategory: string;
  languages: string;
  representation: string;
  rateMin: string;
  rateMax: string;
  availability: string;
  notes: string;
  verified: boolean;
};
const blank: TalentForm = {
  fullName: "",
  category: "Influencer",
  email: "",
  phone: "",
  city: "",
  links: "",
  contentCategory: "",
  languages: "",
  representation: "",
  rateMin: "",
  rateMax: "",
  availability: "AVAILABLE",
  notes: "",
  verified: false,
};
function categoryName(value: string) {
  return value === "UGC creator" ? "UGC creator" : label(value);
}
function profileLinks(links: string) {
  return links
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

export default function TalentPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton big-skeleton" />
        </div>
      }
    >
      <TalentWorkspace />
    </Suspense>
  );
}
function TalentWorkspace() {
  const { data, mutate } = useWorkspace();
  const params = useSearchParams();
  const searchQuery = params.get("search") || "";
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [city, setCity] = useState(""),
    [availability, setAvailability] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [editingId, setEditingId] = useState<string | null>(null),
    [formOpen, setFormOpen] = useState(false),
    [form, setForm] = useState<TalentForm>(blank),
    [deleting, setDeleting] = useState<Talent | null>(null),
    [saving, setSaving] = useState(false),
    [formError, setFormError] = useState("");
  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);
  const talent = useMemo(() => data?.talent || [], [data?.talent]);
  const selected = talent.find((t) => t.id === selectedId);
  const cities = useMemo(
    () => [...new Set(talent.map((t) => t.city))].sort(),
    [talent],
  );
  const filtered = talent.filter(
    (t) =>
      [t.fullName, t.email, t.contentCategory, t.languages, t.representation]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!category || t.category === category) &&
      (!city || t.city === city) &&
      (!availability || t.availability === availability),
  );
  const campaignHistory = selected
    ? data?.campaigns.filter((c) =>
        c.assignments.some((a) => a.talentId === selected.id),
      ) || []
    : [];
  const filterActive = !!(search || category || city || availability);
  function openCreate() {
    setEditingId(null);
    setForm({ ...blank });
    setFormError("");
    setFormOpen(true);
  }
  function openEdit(t: Talent) {
    setSelectedId(null);
    setEditingId(t.id);
    setForm({
      fullName: t.fullName,
      category: t.category,
      email: t.email,
      phone: t.phone || "",
      city: t.city,
      links: t.links,
      contentCategory: t.contentCategory,
      languages: t.languages,
      representation: t.representation,
      rateMin: t.rateMinPaise === null ? "" : String(t.rateMinPaise / 100),
      rateMax: t.rateMaxPaise === null ? "" : String(t.rateMaxPaise / 100),
      availability: t.availability,
      notes: t.notes,
      verified: t.verified,
    });
    setFormError("");
    setFormOpen(true);
  }
  function update<K extends keyof TalentForm>(key: K, value: TalentForm[K]) {
    setForm((v) => ({ ...v, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const min =
        form.rateMin === "" ? null : Math.round(Number(form.rateMin) * 100),
      max = form.rateMax === "" ? null : Math.round(Number(form.rateMax) * 100);
    if (min !== null && max !== null && min > max) {
      setFormError(
        "The maximum rate must be equal to or greater than the minimum rate.",
      );
      return;
    }
    setSaving(true);
    try {
      const details = Object.fromEntries(
        Object.entries(form).filter(
          ([key]) => key !== "rateMin" && key !== "rateMax",
        ),
      );
      await mutate(
        editingId ? `/api/talent/${editingId}` : "/api/talent",
        { ...details, rateMinPaise: min, rateMaxPaise: max },
        editingId ? "PATCH" : "POST",
      );
      setFormOpen(false);
      toast.success(
        editingId ? "Talent profile updated" : "Talent profile added",
      );
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    try {
      await mutate(`/api/talent/${deleting.id}`, undefined, "DELETE");
      setSelectedId(null);
      toast.success("Talent archived. Campaign history is retained.");
    } catch {
    } finally {
      setDeleting(null);
    }
  }
  return (
    <WorkspaceState>
      <div className="page talent-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR CREATIVE NETWORK</div>
            <h1>
              Talent workspace<span className="talent-title-dot">.</span>
            </h1>
            <p>A considered roster. Every detail, in one place.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={17} /> Add talent
          </Button>
        </div>
        <div className="talent-summary">
          <div>
            <span className="talent-summary-icon">
              <Users size={19} />
            </span>
            <div>
              <strong>{talent.length}</strong>
              <span>Talent profiles</span>
            </div>
          </div>
          <div>
            <span className="talent-summary-icon">
              <Check size={19} />
            </span>
            <div>
              <strong>
                {talent.filter((t) => t.availability === "AVAILABLE").length}
              </strong>
              <span>Available to book</span>
            </div>
          </div>
          <div>
            <span className="talent-summary-icon">
              <MapPin size={19} />
            </span>
            <div>
              <strong>{cities.length}</strong>
              <span>Cities represented</span>
            </div>
          </div>
          <div className="talent-demo-note">
            <span>AGENCY MANAGED</span>
            <p>Fictional profiles for your demo workspace.</p>
          </div>
        </div>
        <div className="card talent-table-card">
          <div className="talent-card-heading">
            <div>
              <h2>
                Your roster <span>{talent.length}</span>
              </h2>
              <p>Find the right people for your next project.</p>
            </div>
            <span className="talent-private">
              <BriefcaseBusiness size={14} /> Private workspace
            </span>
          </div>
          <div className="talent-toolbar">
            <div className="talent-search">
              <Search size={17} />
              <Input
                aria-label="Search talent"
                placeholder="Search name, email, or specialty…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="talent-filters">
              <SlidersHorizontal size={16} className="talent-filter-icon" />
              <select
                className="input"
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((v) => (
                  <option key={v} value={v}>
                    {categoryName(v)}
                  </option>
                ))}
              </select>
              <select
                className="input"
                aria-label="Filter by city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities</option>
                {cities.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                className="input"
                aria-label="Filter by availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              >
                <option value="">Availability</option>
                {AVAILABILITY.map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {filtered.length ? (
            <div className="table-wrap">
              <table className="data-table talent-table">
                <thead>
                  <tr>
                    <th>Talent</th>
                    <th>Category / specialty</th>
                    <th>Location</th>
                    <th>Availability</th>
                    <th>Campaigns</th>
                    <th>
                      <span className="sr-only">Profile actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const count =
                      data?.campaigns.filter((c) =>
                        c.assignments.some((a) => a.talentId === t.id),
                      ).length || 0;
                    return (
                      <tr key={t.id}>
                        <td>
                          <button
                            className="talent-identity"
                            onClick={() => setSelectedId(t.id)}
                          >
                            <Avatar name={t.fullName} />
                            <span>
                              <strong>
                                {t.fullName}
                                {t.verified && (
                                  <BadgeCheck
                                    size={14}
                                    className="talent-verified"
                                    aria-label="Manually verified"
                                  />
                                )}
                              </strong>
                              <small>{t.email}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className="talent-category">
                            {categoryName(t.category)}
                          </span>
                          <small className="talent-cell-meta">
                            {t.contentCategory || "—"}
                          </small>
                        </td>
                        <td>
                          <span>{t.city}</span>
                          <small className="talent-cell-meta">
                            {t.languages || "—"}
                          </small>
                        </td>
                        <td>
                          <Badge status={t.availability} />
                        </td>
                        <td>
                          <span className="talent-campaign-count">
                            {count
                              ? `${count} project${count === 1 ? "" : "s"}`
                              : "No projects yet"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`View ${t.fullName}`}
                            onClick={() => setSelectedId(t.id)}
                          >
                            <ArrowUpRight size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={
                filterActive
                  ? "No matching talent"
                  : "Your next collaboration starts here"
              }
              description={
                filterActive
                  ? "Try another name, specialty, or filter."
                  : "Add your first talent profile to start building your agency roster."
              }
              action={
                filterActive ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setCategory("");
                      setCity("");
                      setAvailability("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={openCreate}>
                    <Plus size={16} />
                    Add talent
                  </Button>
                )
              }
            />
          )}
          <div className="talent-table-footer">
            <span>
              Showing {filtered.length} of {talent.length} profiles
            </span>
            <span>
              <span className="talent-demo-dot" /> DEMO DATA · Manually
              maintained profiles
            </span>
          </div>
        </div>
        <Modal
          open={!!selected}
          onOpenChange={(v) => {
            if (!v) setSelectedId(null);
          }}
          title={selected?.fullName || "Talent profile"}
          description="Private agency record · Demo workspace"
          wide
        >
          {selected && (
            <div className="talent-profile">
              <div className="talent-profile-header">
                <Avatar name={selected.fullName} size="lg" />
                <div>
                  <div className="talent-profile-name">
                    {selected.fullName}
                    {selected.verified && (
                      <BadgeCheck size={19} className="talent-verified" />
                    )}
                  </div>
                  <p>
                    {categoryName(selected.category)} ·{" "}
                    {selected.contentCategory}
                  </p>
                  <Badge status={selected.availability} />
                </div>
                <Button variant="secondary" onClick={() => openEdit(selected)}>
                  <Edit3 size={15} />
                  Edit profile
                </Button>
              </div>
              <div className="talent-profile-details">
                <div>
                  <span>Email</span>
                  <a href={`mailto:${selected.email}`}>
                    <Mail size={14} />
                    {selected.email}
                  </a>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{selected.phone || "Not provided"}</strong>
                </div>
                <div>
                  <span>Based in</span>
                  <strong>{selected.city}</strong>
                </div>
                <div>
                  <span>Languages</span>
                  <strong>{selected.languages || "Not provided"}</strong>
                </div>
                <div>
                  <span>Representation</span>
                  <strong>{selected.representation || "Independent"}</strong>
                </div>
                <div>
                  <span>Commercial rate range</span>
                  <strong>
                    {selected.rateMinPaise !== null
                      ? `${money(selected.rateMinPaise)}${selected.rateMaxPaise !== null ? ` – ${money(selected.rateMaxPaise)}` : ""}`
                      : "Not recorded"}
                  </strong>
                </div>
              </div>
              <section className="talent-profile-section">
                <h3>Portfolio & social links</h3>
                {profileLinks(selected.links).length ? (
                  <div className="talent-profile-links">
                    {profileLinks(selected.links).map((url, i) => (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={`${url}-${i}`}
                      >
                        {url.replace(/^https?:\/\//, "")}
                        <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No portfolio links recorded.</p>
                )}
              </section>
              <section className="talent-profile-section">
                <h3>Professional notes</h3>
                <p className="talent-notes">
                  {selected.notes ||
                    "No notes yet. Add context that helps your team collaborate."}
                </p>
              </section>
              <section className="talent-profile-section">
                <h3>
                  Campaigns & project history{" "}
                  <span>{campaignHistory.length}</span>
                </h3>
                {campaignHistory.length ? (
                  <div className="talent-history">
                    {campaignHistory.map((c) => {
                      const assignment = c.assignments.find(
                        (a) => a.talentId === selected.id,
                      )!;
                      return (
                        <Link
                          key={c.id}
                          href={`/campaigns/${c.id}`}
                          onClick={() => setSelectedId(null)}
                        >
                          <div>
                            <strong>{c.name}</strong>
                            <small>
                              {c.brand.name} · {date(c.startDate)} –{" "}
                              {date(c.endDate, true)}
                            </small>
                          </div>
                          <Badge
                            status={
                              assignment.deliverable?.status ||
                              assignment.status
                            }
                          />
                          <ChevronRight size={16} />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">No campaign assignments yet.</p>
                )}
              </section>
              <div className="talent-profile-audit">
                <p>
                  {selected.verified
                    ? "Manually marked verified by your agency."
                    : "This profile has not been marked verified by your agency."}{" "}
                  Social metrics are not independently verified.
                </p>
                <span>
                  Added {date(selected.createdAt, true)} · Updated{" "}
                  {date(selected.updatedAt, true)}
                </span>
              </div>
              <div className="form-actions talent-profile-actions">
                <Button
                  variant="danger"
                  onClick={() => {
                    setSelectedId(null);
                    setDeleting(selected);
                  }}
                >
                  <Trash2 size={15} />
                  Delete profile
                </Button>
                <Button variant="secondary" onClick={() => setSelectedId(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal>
        <Modal
          open={formOpen}
          onOpenChange={(v) => {
            if (!saving) setFormOpen(v);
          }}
          title={
            editingId ? "Edit talent profile" : "Add talent to your roster"
          }
          description="Agency-managed records. Keep professional details accurate and relevant."
          wide
        >
          <form onSubmit={save} className="talent-form">
            <div className="form-grid">
              <Field label="Full name *">
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  autoFocus
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="e.g. Aanya Mehta"
                />
              </Field>
              <Field label="Professional category *">
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {CATEGORIES.map((v) => (
                    <option key={v} value={v}>
                      {categoryName(v)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Email address *">
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="talent@example.com"
                />
              </Field>
              <Field label="Phone (optional)">
                <Input
                  type="tel"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91"
                />
              </Field>
              <Field label="City *">
                <Input
                  required
                  maxLength={100}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              </Field>
              <Field label="Primary content category">
                <Input
                  maxLength={100}
                  value={form.contentCategory}
                  onChange={(e) => update("contentCategory", e.target.value)}
                  placeholder="e.g. Beauty & lifestyle"
                />
              </Field>
              <Field label="Languages">
                <Input
                  maxLength={200}
                  value={form.languages}
                  onChange={(e) => update("languages", e.target.value)}
                  placeholder="e.g. English, Hindi"
                />
              </Field>
              <Field label="Management / representation">
                <Input
                  maxLength={200}
                  value={form.representation}
                  onChange={(e) => update("representation", e.target.value)}
                  placeholder="e.g. Independent"
                />
              </Field>
              <Field label="Minimum rate (₹)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max="21474836.47"
                  value={form.rateMin}
                  onChange={(e) => update("rateMin", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Maximum rate (₹)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max="21474836.47"
                  value={form.rateMax}
                  onChange={(e) => update("rateMax", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Availability">
                <select
                  className="input"
                  value={form.availability}
                  onChange={(e) => update("availability", e.target.value)}
                >
                  {AVAILABILITY.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Social / portfolio links"
              hint="Use complete https:// links, separated by a comma or a new line."
            >
              <textarea
                className="input"
                rows={2}
                maxLength={2000}
                value={form.links}
                onChange={(e) => update("links", e.target.value)}
                placeholder="https://portfolio.example.com"
              />
            </Field>
            <Field label="Professional notes">
              <textarea
                className="input"
                rows={3}
                maxLength={5000}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Working style, preferences, and useful professional context…"
              />
            </Field>
            <label className="talent-verification">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => update("verified", e.target.checked)}
              />
              <span>
                <strong>Manually mark this profile verified</strong>
                <small>
                  Only select this after your agency has reviewed the record.
                  This does not verify social metrics.
                </small>
              </span>
            </label>
            {formError && (
              <p role="alert" className="talent-form-error">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" busy={saving}>
                {editingId ? "Save changes" : "Add talent"}
              </Button>
            </div>
          </form>
        </Modal>
        <Confirm
          open={!!deleting}
          onOpenChange={(v) => {
            if (!v) setDeleting(null);
          }}
          title={`Delete ${deleting?.fullName || "talent"}?`}
          description="This profile will be removed from your active roster. Existing campaign history and audit records will be retained."
          onConfirm={() => void remove()}
        />
      </div>
    </WorkspaceState>
  );
}
