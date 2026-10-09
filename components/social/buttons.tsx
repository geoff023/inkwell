"use client";

import { Bookmark, Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { setBlock, setBookmark, setFollow, setLike, type ActionResult } from "@/lib/posts/actions";

/**
 * Optimistic toggle: flips immediately, then settles on the server's answer
 * or rolls back and shows the error. Signed-out visitors go to log in.
 */
function useToggle<T extends object>(initial: boolean, run: (next: boolean) => Promise<ActionResult<T>>, onOk?: (res: T) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const next = !on;
      setOn(next);
      setError(null);
      try {
        const res = await run(next);
        if (res.ok) {
          onOk?.(res);
          return;
        }
        setOn(!next);
        if (res.needsLogin) router.push(`/login?next=${encodeURIComponent(pathname)}`);
        else setError(res.message);
      } catch {
        setOn(!next);
        setError("Couldn't reach the server. Try again.");
      }
    });

  return { on, error, pending, toggle };
}

const iconButton =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-muted hover:bg-paper-soft hover:text-ink aria-pressed:text-ink disabled:opacity-60";

function ErrorTip({ error }: { error: string | null }) {
  return error ? (
    <span role="alert" className="text-xs text-danger">
      {error}
    </span>
  ) : null;
}

export function LikeButton({ entryId, liked, count }: { entryId: string; liked: boolean; count: number }) {
  const [serverCount, setServerCount] = useState(count);
  const [baseLiked, setBaseLiked] = useState(liked);
  const { on, error, toggle } = useToggle(liked, (next) => setLike(entryId, next), (res) => {
    setServerCount(res.count);
    setBaseLiked(res.liked);
  });
  // Show the confirmed count adjusted for an in-flight optimistic change.
  const shown = serverCount + (on === baseLiked ? 0 : on ? 1 : -1);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? "Unlike" : "Like"} className={iconButton}>
        <Heart aria-hidden className={`size-4 ${on ? "fill-taupe text-taupe" : ""}`} strokeWidth={1.8} />
        <span aria-hidden>{shown}</span>
        <span className="sr-only">{shown === 1 ? "1 like" : `${shown} likes`}</span>
      </button>
      <ErrorTip error={error} />
    </span>
  );
}

export function BookmarkButton({ entryId, bookmarked }: { entryId: string; bookmarked: boolean }) {
  const { on, error, toggle } = useToggle(bookmarked, (next) => setBookmark(entryId, next));
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={toggle} aria-pressed={on} className={iconButton}>
        <Bookmark aria-hidden className={`size-4 ${on ? "fill-ink" : ""}`} strokeWidth={1.8} />
        <span className="sr-only sm:not-sr-only">{on ? "Saved" : "Save"}</span>
      </button>
      <ErrorTip error={error} />
    </span>
  );
}

export function FollowButton({ profileId, following }: { profileId: string; following: boolean }) {
  const router = useRouter();
  const { on, error, pending, toggle } = useToggle(following, (next) => setFollow(profileId, next), () => router.refresh());
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={on} className={buttonClass(on ? "secondary" : "primary", "px-5 py-2")}>
        {on ? "Following" : "Follow"}
      </button>
      <ErrorTip error={error} />
    </span>
  );
}

export function BlockButton({ profileId, blocked, name }: { profileId: string; blocked: boolean; name: string }) {
  const router = useRouter();
  const { on, error, pending, toggle } = useToggle(blocked, (next) => setBlock(profileId, next), () => router.refresh());
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (on || window.confirm(`Block ${name}? They won't be able to follow you, like or comment on your writing, and their posts will be hidden from your feed.`)) toggle();
        }}
        className={buttonClass("ghost", "px-3 py-1.5 text-xs")}
      >
        {on ? "Unblock" : "Block"}
      </button>
      <ErrorTip error={error} />
    </span>
  );
}
