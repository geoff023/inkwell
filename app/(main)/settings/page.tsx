import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { buttonClass } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";
import { DeleteAccountForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-10">
      <h2 id={id} className="font-serif text-2xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-3xl">Settings</h1>
      <p className="mt-1.5 mb-8 text-sm text-muted">
        Your public profile is at{" "}
        <Link href={`/u/${viewer.username}`} className="text-ink underline underline-offset-4">
          /u/{viewer.username}
        </Link>
        .
      </p>

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
    </main>
  );
}
