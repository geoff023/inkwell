"use client";

import { BookLock, Bookmark, Compass, House, Library, LogOut, PenLine, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOut } from "@/app/(auth)/actions";

const APP_LINKS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/journal", label: "Journal", icon: BookLock },
  { href: "/library", label: "Library", icon: Library },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/saved", label: "Saved", icon: Bookmark },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar sections, set in the serif like a journal's contents page. When
 * the frame is collapsed the labels become screen-reader text and tooltips.
 */
export function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main">
      <ul className="space-y-1">
        {APP_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              title={label}
              aria-current={isActive(href) ? "page" : undefined}
              className="group flex h-10 items-center gap-3 rounded-lg px-3 font-serif text-[1.05rem] whitespace-nowrap text-muted transition-colors hover:bg-paper-soft hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_0_0_1px_var(--color-line)] group-data-[collapsed=true]/shell:mx-auto group-data-[collapsed=true]/shell:size-10 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-0"
            >
              <Icon aria-hidden className="size-[1.1rem] shrink-0 text-taupe group-hover:text-ink group-aria-[current=page]:text-ink" strokeWidth={1.5} />
              <span className="group-data-[collapsed=true]/shell:sr-only">{label}</span>
              <span
                aria-hidden
                className="ml-auto size-1.5 rounded-full bg-ink opacity-0 group-aria-[current=page]:opacity-100 group-data-[collapsed=true]/shell:hidden"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const MOBILE_LINKS = [APP_LINKS[0], APP_LINKS[3], { href: "/write", label: "Write", icon: PenLine }, APP_LINKS[1], APP_LINKS[2]];

export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {MOBILE_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted aria-[current=page]:text-ink"
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.6} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AccountMenu({ username, displayName }: { username: string; displayName: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  const item = "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-paper-soft";
  return (
    <details ref={ref} className="relative">
      <summary
        aria-label="Account menu"
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white font-serif text-sm text-ink [&::-webkit-details-marker]:hidden"
      >
        {displayName.trim().charAt(0).toUpperCase() || "?"}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-line bg-white p-1.5 shadow-sm">
        <p className="truncate px-3 pt-1.5 pb-2 text-xs text-muted">@{username}</p>
        <Link href={`/u/${username}`} className={item}>
          <UserRound aria-hidden className="size-4" /> Your profile
        </Link>
        <Link href="/saved" className={item}>
          <Bookmark aria-hidden className="size-4" /> Saved
        </Link>
        <Link href="/settings" className={item}>
          <Settings aria-hidden className="size-4" /> Settings
        </Link>
        <form action={signOut}>
          <button type="submit" className={item}>
            <LogOut aria-hidden className="size-4" /> Log out
          </button>
        </form>
      </div>
    </details>
  );
}
