import { MobileNav } from "@/components/shell/nav";
import { SiteHeader } from "@/components/shell/site-header";
import { getViewer } from "@/lib/auth";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  return (
    <>
      <a href="#content" className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <SiteHeader viewer={viewer} />
      <div id="content" tabIndex={-1} className={`flex flex-1 flex-col outline-none ${viewer ? "pb-20 md:pb-0" : ""}`}>
        {children}
      </div>
      {viewer && <MobileNav />}
    </>
  );
}
