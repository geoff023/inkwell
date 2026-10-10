import { LogOut, PenLine, Settings } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/social/avatar";
import { buttonClass } from "@/components/ui/button";
import type { Viewer } from "@/lib/auth";
import { AccountMenu, SidebarNav } from "./nav";
import { SidebarToggle } from "./shell-frame";
import { Wordmark } from "./wordmark";

const todayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

/** Visitors: a simple top bar at every size. */
export function GuestHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 2xl:max-w-7xl">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <div className="hidden gap-1 sm:flex sm:gap-2">
            <Link href="/discover" className={buttonClass("ghost")}>
              Discover
            </Link>
            <Link href="/about" className={buttonClass("ghost")}>
              About
            </Link>
          </div>
          <Link href="/login" className={buttonClass("ghost")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "px-4 py-2")}>
            Start writing
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Signed in, below 1024px: wordmark and account; sections live in the bottom bar. */
export function CompactHeader({ viewer }: { viewer: Viewer }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark href="/home" />
        <AccountMenu username={viewer.username} displayName={viewer.display_name} />
      </div>
    </header>
  );
}

/**
 * Signed in, 1024px and up: a quiet contents-page sidebar. Collapses to an
 * icon rail; the collapsed styles key off the frame's data attribute.
 */
export function Sidebar({ viewer }: { viewer: Viewer }) {
  const footerItem =
    "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm whitespace-nowrap text-muted hover:bg-paper-soft hover:text-ink group-data-[collapsed=true]/shell:mx-auto group-data-[collapsed=true]/shell:w-9 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-0";
  const collapsedLabel = "group-data-[collapsed=true]/shell:sr-only";
  return (
    <aside
      id="app-sidebar"
      aria-label="Sidebar"
      className="sticky top-0 hidden h-dvh flex-col overflow-x-hidden overflow-y-auto border-r border-line bg-paper-soft/40 lg:flex"
    >
      <div className="flex items-center justify-between gap-2 px-5 pt-6 group-data-[collapsed=true]/shell:flex-col group-data-[collapsed=true]/shell:gap-4 group-data-[collapsed=true]/shell:px-0">
        <Wordmark href="/home" hideTextClassName="group-data-[collapsed=true]/shell:hidden" />
        <SidebarToggle />
      </div>
      {/* ponytail: server-rendered date (server time zone); fine for a caption. */}
      <p className="mt-1 px-5 font-serif text-sm whitespace-nowrap text-muted italic group-data-[collapsed=true]/shell:hidden">
        {todayFmt.format(new Date())}
      </p>

      <div className="mt-7 px-4 group-data-[collapsed=true]/shell:px-0">
        <Link
          href="/write"
          title="Write"
          className={buttonClass(
            "primary",
            "w-full group-data-[collapsed=true]/shell:mx-auto group-data-[collapsed=true]/shell:flex group-data-[collapsed=true]/shell:size-10 group-data-[collapsed=true]/shell:p-0",
          )}
        >
          <PenLine aria-hidden className="size-4" />
          <span className={collapsedLabel}>Write</span>
        </Link>
      </div>

      <div className="mt-6 px-3 group-data-[collapsed=true]/shell:px-0">
        <SidebarNav />
      </div>

      <div className="mt-auto space-y-0.5 px-3 pt-6 pb-5 group-data-[collapsed=true]/shell:px-0">
        <Link
          href={`/u/${viewer.username}`}
          title="Your profile"
          className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper-soft group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-0"
        >
          <Avatar name={viewer.display_name} />
          <span className={`min-w-0 ${collapsedLabel}`}>
            <span className="block truncate text-sm font-medium text-ink">{viewer.display_name}</span>
            <span className="block truncate text-xs text-muted">@{viewer.username}</span>
          </span>
        </Link>
        <Link href="/settings" title="Settings" className={footerItem}>
          <Settings aria-hidden className="size-4 shrink-0" strokeWidth={1.6} />
          <span className={collapsedLabel}>Settings</span>
        </Link>
        <form action={signOut}>
          <button type="submit" title="Log out" className={footerItem}>
            <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.6} />
            <span className={collapsedLabel}>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
