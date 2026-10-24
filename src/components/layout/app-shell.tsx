"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Clapperboard,
  Users,
  FileText,
  Sparkles,
  Activity,
  Settings,
  Search,
  ChevronRight,
  ArrowUpRight,
  Menu,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import {
  useWorkspace,
  WorkspaceProvider,
  WorkspaceState,
} from "@/components/workspace-provider";
import { Modal, Input, Avatar } from "@/components/ui";
const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Clapperboard },
  { href: "/talent", label: "Talent", icon: Users },
  { href: "/briefs", label: "AI Briefs", icon: FileText },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];
export function FaymioMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 5h22L16 16H5V5Z" fill="currentColor" />
      <path d="M5 19h11L5 30V19Z" fill="currentColor" />
      <path d="m19 19 8-8v8h-8Z" fill="currentColor" opacity=".5" />
    </svg>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { data } = useWorkspace();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [dark, setDark] = useState(false);
  useEffect(() => {
    const applyTheme = () => {
      const isDark = localStorage.getItem("faymio-theme") === "dark";
      setDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    };
    applyTheme();
    window.addEventListener("faymio-theme", applyTheme);
    return () => window.removeEventListener("faymio-theme", applyTheme);
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [path]);
  useEffect(() => {
    const cb = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    document.addEventListener("keydown", cb);
    return () => document.removeEventListener("keydown", cb);
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("faymio-theme", next ? "dark" : "light");
  };
  const current = [
    ...nav,
    { href: "/activity", label: "Activity" },
    { href: "/settings", label: "Settings" },
  ].find((n) => path.startsWith(n.href));
  return (
    <div className="app-shell">
      <button
        className={`sidebar-scrim ${mobile ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Link href="/dashboard" className="brand">
          <FaymioMark />
          <span>
            faymio<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-icon">
            {data?.organization.name.charAt(0) || "A"}
            <span>✦</span>
          </span>
          <span>
            <strong>{data?.organization.name || "Agency workspace"}</strong>
            <small>Agency workspace</small>
          </span>
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={path.startsWith(href) ? "nav-item active" : "nav-item"}
            >
              <Icon size={18} />
              <span>{label}</span>
              {href === "/assistant" && <span className="nav-new">AI</span>}
              {path.startsWith(href) && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="nav-divider" />
          <Link
            className={`nav-item ${path === "/activity" ? "active" : ""}`}
            href="/activity"
          >
            <Activity size={18} />
            Activity
          </Link>
          <Link
            className={`nav-item ${path === "/settings" ? "active" : ""}`}
            href="/settings"
          >
            <Settings size={18} />
            Settings
          </Link>
          <div className="sidebar-note">
            <span className="sparkle-tile">
              <Sparkles size={17} />
            </span>
            <strong>
              Less coordination.
              <br />
              More creation.
            </strong>
            <p>
              Your next campaign starts
              <br />
              with a little clarity.
            </p>
            <Link href="/briefs">
              Create with a brief <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="sidebar-profile">
            <Avatar name={data?.user.name || "Demo Admin"} size="sm" />
            <span>
              <strong>{data?.user.name || "Demo Admin"}</strong>
              <small>Workspace admin</small>
            </span>
            <Link href="/settings" aria-label="Account settings">
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-workspace">Workspace</span>
            <ChevronRight size={13} />
            <span>
              {path.startsWith("/campaigns/")
                ? "Campaign details"
                : current?.label || "Overview"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              <i />
              Demo workspace
            </span>
            <button
              className="search-trigger"
              onClick={() => setSearch(true)}
              aria-label="Search workspace"
            >
              <Search size={16} />
              <span>Quick search</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-separator" />
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              href="/settings"
              className="top-avatar"
              aria-label="Workspace settings"
            >
              <Avatar name={data?.user.name || "Demo Admin"} size="sm" />
            </Link>
          </div>
        </header>
        <main>
          <WorkspaceState>{children}</WorkspaceState>
        </main>
        <footer className="app-footer">
          <span>
            FAYMIO <span className="footer-dot">·</span> The Professional World
            of Entertainment.
          </span>
          <span>Fictional records · Demo data</span>
        </footer>
      </div>
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="Search your workspace"
        description="Find a campaign or talent profile."
      >
        <div className="search-field">
          <Search size={18} />
          <Input
            autoFocus
            aria-label="Search campaigns and talent"
            placeholder="Search campaigns, talent…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="search-results">
          {data?.campaigns
            .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
            .map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                onClick={() => setSearch(false)}
              >
                <Clapperboard size={18} />
                <span>
                  {c.name}
                  <small>{c.brand.name} · Campaign</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          {data?.talent
            .filter((t) =>
              t.fullName.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 8)
            .map((t) => (
              <Link
                key={t.id}
                href={`/talent?search=${encodeURIComponent(t.fullName)}`}
                onClick={() => setSearch(false)}
              >
                <Avatar name={t.fullName} size="sm" />
                <span>
                  {t.fullName}
                  <small>
                    {t.category} · {t.city}
                  </small>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
        </div>
      </Modal>
    </div>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
