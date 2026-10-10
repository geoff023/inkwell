import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { railAside, railGrid, railMain, sectionHeading } from "@/components/shell/page-grid";
import { PageHeader } from "@/components/shell/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { DeleteAccountForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  ["profile", "Profile"],
  ["privacy", "Privacy"],
  ["account", "Account"],
  ["delete", "Delete account"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 border-t border-line py-10 first:border-t-0 first:pt-0">
      <h2 id={`${id}-heading`} className={sectionHeading}>
        {title}
      </h2>
      {/* Forms stay at a comfortable field width even in the wide column. */}
      <div className="mt-6 max-w-xl">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  return (
    <main className={railGrid}>
      <PageHeader
        title="Settings"
        description={
          <p>
            Your public profile is at{" "}
            <Link href={`/u/${viewer.username}`} className="text-ink underline underline-offset-4">
              /u/{viewer.username}
            </Link>
            .
          </p>
        }
      />

      <nav aria-label="Settings sections" className={`hidden xl:mt-2 xl:block ${railAside}`}>
        <ul className="space-y-0.5 text-sm">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-md px-2.5 py-1.5 text-muted hover:bg-paper-soft hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={railMain}>

      <Section id="profile" title="Profile">
        <ProfileForm
          initial={{ displayName: viewer.display_name, username: viewer.username, bio: viewer.bio ?? "", interests: viewer.interests }}
        />
      </Section>

      <Section id="privacy" title="Privacy">
        <ul className="space-y-3 text-sm leading-relaxed text-muted">
          <li>Every new entry is private until you publish it, and you can unpublish at any time.</li>
          <li>Your saved posts, blocks and email address are never shown to anyone.</li>
          <li>
            Private writing is stored as private application data. Database access rules keep it readable only by you. It
            isn&apos;t end-to-end encrypted.
          </li>
        </ul>
      </Section>

      <Section id="account" title="Account">
        <div className="flex flex-wrap gap-3">
          <Link href="/forgot-password" className={buttonClass("secondary")}>
            Change password
          </Link>
          <form action={signOut}>
            <button type="submit" className={buttonClass("secondary")}>
              Log out
            </button>
          </form>
        </div>
      </Section>

      <Section id="delete" title="Delete account">
        <p className="mb-5 text-sm leading-relaxed text-muted">
          This permanently deletes your account, every entry you&apos;ve written (private and public), your comments, likes,
          bookmarks and follows. It can&apos;t be undone.
        </p>
        <DeleteAccountForm username={viewer.username} />
      </Section>
      </div>
    </main>
  );
}
