import { Globe, Lock, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { displayTitle, excerpt } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import { deleteEntry } from "@/lib/entries/actions";
import type { OwnEntrySummary } from "@/lib/entries/queries";
import { isPublic, stateLabel } from "@/lib/entries/state";

export function StateBadge({ entry }: { entry: Pick<OwnEntrySummary, "status" | "visibility"> }) {
  const pub = isPublic(entry);
  const Icon = pub ? Globe : Lock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${pub ? "bg-sand/50 text-ink" : "bg-paper-soft text-muted"}`}>
      <Icon aria-hidden className="size-3" />
      {stateLabel(entry)}
    </span>
  );
}

export function OwnEntryItem({ entry, redirectTo }: { entry: OwnEntrySummary; redirectTo?: "/library" | "/journal" }) {
  const title = displayTitle(entry);
  // Title-less entries already show their first line as the heading.
  const body = excerpt(entry.title ? entry.content_text : entry.content_text.trim().split("\n").slice(1).join(" "), 220);
  return (
    <article className="group relative py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <time dateTime={entry.updated_at}>Edited {formatDate(entry.updated_at)}</time>
        <StateBadge entry={entry} />
        {entry.tags.map((t) => (
          <span key={t.slug}>#{t.name}</span>
        ))}
      </div>
      <h3 className="mt-2 font-serif text-xl leading-snug">
        <Link href={`/write/${entry.id}`} className="after:absolute after:inset-0 hover:underline hover:decoration-sand hover:underline-offset-4">
          {title}
        </Link>
      </h3>
      {body && <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted">{body}</p>}
      {redirectTo && (
        <div className="relative z-10 mt-3 flex gap-1">
          <Link href={`/write/${entry.id}`} className={buttonClass("ghost", "px-2.5 py-1 text-xs")}>
            Edit
          </Link>
          {isPublic(entry) && (
            <Link href={`/post/${entry.id}`} className={buttonClass("ghost", "px-2.5 py-1 text-xs")}>
              View post
            </Link>
          )}
          <ConfirmDialog
            trigger="Delete"
            triggerClassName={buttonClass("ghost", "px-2.5 py-1 text-xs hover:text-danger")}
            title="Delete this entry?"
            description={
              <>
                <span className="font-medium text-ink">{title}</span> will be permanently deleted
                {isPublic(entry) ? ", along with its likes and comments" : ""}. This can&apos;t be undone.
              </>
            }
            confirmLabel="Delete"
            pendingLabel="Deleting…"
            action={deleteEntry}
            fields={{ id: entry.id, redirectTo }}
          />
        </div>
      )}
    </article>
  );
}

export function SearchForm({ action, q, placeholder, hidden = {} }: { action: string; q?: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} role="search" className="relative">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="search-q" className="sr-only">
        Search your writing
      </label>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={100}
        placeholder={placeholder}
        className="w-full rounded-full border border-line bg-white py-2.5 pr-4 pl-10 text-base focus:border-taupe focus:outline-none sm:text-sm"
      />
    </form>
  );
}

export function FilterChips({
  label,
  options,
  current,
  hrefFor,
}: {
  label: string;
  options: { value: string; label: string }[];
  current: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Link
          key={o.value}
          href={hrefFor(o.value)}
          aria-current={o.value === current ? "page" : undefined}
          className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand px-6 py-14 text-center">
      <p className="font-serif text-xl">{title}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
