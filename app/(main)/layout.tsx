import { MobileNav } from "@/components/shell/nav";
import { SiteHeader } from "@/components/shell/site-header";
import { getViewer } from "@/lib/auth";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  return (
    <>
      <SiteHeader viewer={viewer} />
      <div className={`flex flex-1 flex-col ${viewer ? "pb-20 md:pb-0" : ""}`}>{children}</div>
      {viewer && <MobileNav />}
    </>
  );
}
