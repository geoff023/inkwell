import { cookies } from "next/headers";
import { MobileNav } from "@/components/shell/nav";
import { ShellFrame, SIDEBAR_COOKIE } from "@/components/shell/shell-frame";
import { CompactHeader, GuestHeader, Sidebar } from "@/components/shell/site-header";
import { getViewer } from "@/lib/auth";

const skipLink =
  "sr-only z-50 rounded-md bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <>
        <a href="#content" className={skipLink}>
          Skip to content
        </a>
        <GuestHeader />
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </>
    );
  }

  // Phones and tablets: compact top bar + bottom tabs. Laptops and up: sidebar.
  return (
    <ShellFrame initialCollapsed={(await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed"}>
      <a href="#content" className={skipLink}>
        Skip to content
      </a>
      <Sidebar viewer={viewer} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CompactHeader viewer={viewer} />
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col pb-20 outline-none lg:pb-0">
          {children}
        </div>
      </div>
      <MobileNav />
    </ShellFrame>
  );
}
