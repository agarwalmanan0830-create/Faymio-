"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace-provider";
import { Modal, Field, Input, Button } from "@/components/ui";
export function CampaignCreate({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { mutate, data } = useWorkspace(),
    router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Make your next move."
      description="Create a campaign and bring your team into focus."
      wide
    >
      <Link
        className="brief-shortcut"
        href="/briefs"
        onClick={() => onOpenChange(false)}
      >
        <Sparkles size={20} />
        <span>
          <strong>Start with a brand brief</strong>
          <small>Turn a few words into a structured campaign.</small>
        </span>
        <ArrowUpRight size={18} />
      </Link>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const c = await mutate("/api/campaigns", {
              name: f.get("name"),
              brandName: f.get("brand"),
              budgetPaise: Math.round(Number(f.get("budget")) * 100),
              startDate: new Date(String(f.get("start"))).toISOString(),
              endDate: new Date(String(f.get("end"))).toISOString(),
              manager: f.get("manager"),
              status: "ACTIVE",
              objective: f.get("objective"),
              requiredCategory: f.get("category"),
              creatorCount: Number(f.get("count")),
              deliverableBrief: f.get("deliverable"),
              approvalRequired: f.get("approval") === "on",
            });
            toast.success("Campaign created");
            onOpenChange(false);
            router.push(`/campaigns/${c.id || c.campaign?.id}`);
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label="Campaign name">
            <Input
              name="name"
              required
              maxLength={160}
              placeholder="e.g. Summer in the city"
            />
          </Field>
          <Field label="Brand">
            <Input
              name="brand"
              required
              maxLength={120}
              placeholder="Brand name"
            />
          </Field>
          <Field label="Budget (₹)">
            <Input
              type="number"
              name="budget"
              required
              min="0"
              step="1"
              defaultValue="100000"
            />
          </Field>
          <Field label="Campaign manager">
            <Input
              name="manager"
              required
              defaultValue={data?.user.name || "Avni Sharma"}
            />
          </Field>
          <Field label="Start date">
            <Input
              name="start"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </Field>
          <Field label="End date">
            <Input name="end" type="date" required />
          </Field>
          <Field label="Talent category">
            <select name="category" className="input">
              <option>Influencer</option>
              <option>UGC creator</option>
              <option>Model</option>
              <option>Actor</option>
            </select>
          </Field>
          <Field label="Creators needed">
            <Input
              name="count"
              type="number"
              min="1"
              max="10000"
              defaultValue="10"
              required
            />
          </Field>
          <Field label="Campaign objective">
            <Input
              name="objective"
              placeholder="What does success look like?"
              maxLength={2000}
            />
          </Field>
          <Field label="Deliverables">
            <Input
              name="deliverable"
              placeholder="One Instagram reel per creator"
              maxLength={2000}
            />
          </Field>
        </div>
        <label className="check-label">
          <input name="approval" type="checkbox" defaultChecked /> Brand
          approval required before publishing
        </label>
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button busy={busy}>Create campaign</Button>
        </div>
      </form>
    </Modal>
  );
}
