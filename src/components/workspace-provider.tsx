"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Workspace } from "@/types";
const Context = createContext<{
  data: Workspace | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (url: string, body?: unknown, method?: string) => Promise<any>;
}>({
  data: null,
  loading: true,
  error: null,
  refresh: async () => {},
  mutate: async () => {},
});
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/workspace", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not load workspace");
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const mutate = async (url: string, body?: unknown, method = "POST") => {
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Could not save changes");
      await refresh();
      return d;
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    }
  };
  return (
    <Context.Provider value={{ data, loading, error, refresh, mutate }}>
      {children}
    </Context.Provider>
  );
}
export const useWorkspace = () => useContext(Context);
export function WorkspaceState({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = useWorkspace();
  if (loading)
    return (
      <div className="page">
        <div className="skeleton title-skeleton" />
        <div className="skeleton-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
        <div className="skeleton big-skeleton" />
      </div>
    );
  if (error)
    return (
      <div className="empty">
        <h2>Workspace unavailable</h2>
        <p>{error}</p>
        <button
          className="button button-primary"
          onClick={() => void refresh()}
        >
          Try again
        </button>
      </div>
    );
  return children;
}
