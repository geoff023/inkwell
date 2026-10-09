import { PenLine } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import type { Viewer } from "@/lib/auth";
import { AccountMenu, DesktopNav } from "./nav";
import { Wordmark } from "./wordmark";

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Wordmark href={viewer ? "/home" : "/"} />
        {viewer ? (
          <div className="flex items-center gap-3">
            <DesktopNav />
            <div className="hidden md:block">
              <Link href="/write" className={buttonClass("primary", "px-4 py-2")}>
                <PenLine aria-hidden className="size-4" /> Write
              </Link>
            </div>
            <AccountMenu username={viewer.username} displayName={viewer.display_name} />
          </div>
        ) : (
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
        )}
      </div>
    </header>
  );
}
