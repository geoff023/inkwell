"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

export const SIDEBAR_COOKIE = "inkwell-sidebar";

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void } | null>(null);

/**
 * Signed-in app frame. Holds the sidebar's collapsed state on a data
 * attribute, so the (server-rendered) sidebar restyles itself with CSS alone.
 * The state lives in a cookie so the server renders the right width first.
 */
export function ShellFrame({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // Ctrl/Cmd + \ toggles the sidebar, as in most writing apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "\\" || e.code === "Backslash")) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <SidebarContext value={{ collapsed, toggle }}>
      <div
        data-collapsed={collapsed}
        className="group/shell flex flex-1 flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out 2xl:grid-cols-[17rem_minmax(0,1fr)] lg:data-[collapsed=true]:grid-cols-[4.5rem_minmax(0,1fr)]"
      >
        {children}
      </div>
    </SidebarContext>
  );
}

export function SidebarToggle() {
  const ctx = use(SidebarContext);
  if (!ctx) return null;
  const Icon = ctx.collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = ctx.collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-expanded={!ctx.collapsed}
      aria-controls="app-sidebar"
      title={`${label} (Ctrl+\\)`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-paper-soft hover:text-ink"
    >
      <Icon aria-hidden className="size-4" strokeWidth={1.6} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
