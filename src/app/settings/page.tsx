"use client";
import { Download, ShieldCheck, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace-provider";
import { Button, Badge } from "@/components/ui";
export default function Settings() {
  const { data } = useWorkspace();
  const theme = (value: string) => {
    const dark = value === "dark";
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("faymio-theme", value);
    window.dispatchEvent(new Event("faymio-theme"));
    toast.success(`${dark ? "Dark" : "Light"} appearance saved`);
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, YOUR WAY</div>
          <h1>
            A place to do great work<span className="accent-dot">.</span>
          </h1>
          <p>Workspace details, preferences, and a few things worth knowing.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card settings-card">
          <h2>Workspace details</h2>
          <p>A fictional agency workspace for exploring Faymio.</p>
          <div className="setting-row">
            <span>Organization</span>
            <strong>{data?.organization.name}</strong>
          </div>
          <div className="setting-row">
            <span>Demo administrator</span>
            <strong>{data?.user.name}</strong>
          </div>
          <div className="setting-row">
            <span>Workspace currency</span>
            <strong>Indian rupee · INR</strong>
          </div>
          <div className="setting-row">
            <span>Display timezone</span>
            <strong>India Standard Time · UTC+05:30</strong>
          </div>
          <div className="setting-row">
            <span>AI provider</span>
            <Badge status="ACTIVE">
              {data?.aiMode === "demo" ? "Demo AI mode" : "OpenAI configured"}
            </Badge>
          </div>
          <p className="info-note">
            <strong>Demo access</strong>
            <br />
            This workspace uses a server-selected demonstration identity. It is
            intended for local evaluation. All seeded talent, brands, and
            campaign histories are fictional.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `faymio-workspace-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Workspace export downloaded");
            }}
          >
            <Download size={16} />
            Export workspace data
          </Button>
        </section>
        <div className="space-y-5">
          <section className="card settings-card">
            <h2>Make yourself comfortable</h2>
            <p>Choose an appearance. Your preference stays on this device.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => theme("light")}>
                <Sun size={16} />
                Light
              </Button>
              <Button variant="secondary" onClick={() => theme("dark")}>
                <Moon size={16} />
                Dark
              </Button>
            </div>
          </section>
          <section className="card settings-card">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent" />
              <h2>Human decisions, always</h2>
            </div>
            <p>
              Faymio structures briefs and surfaces operational context. You
              review campaigns, approve work, and decide what happens next.
              Message drafts are copied for review; payment records only track
              status.
            </p>
            <div className="info-note">
              <strong>Before real customer onboarding</strong>
              <br />
              Configure authenticated organization membership, role-based
              permissions, secure hosting, provider secrets, backups, and
              operational monitoring. See the included README for the production
              checklist.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
