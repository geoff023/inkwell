"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveEntry } from "@/lib/entries/actions";
import type { DocNode } from "@/lib/content";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "blocked";

export type Snapshot = { title: string; content: DocNode; empty: boolean };

const DEBOUNCE_MS = 1000;
const RETRY_MS = 5000;
/** Gaps between edits longer than this count as a break, not writing time. */
const IDLE_MS = 30_000;

/**
 * Debounced, ordered autosave.
 *
 * - Edits bump `editVersion`; a save records the version it captured, so the
 *   status only reads "Saved" once the latest edit is actually persisted.
 * - At most one save is in flight; later edits wait and then save the newest
 *   snapshot, so responses can't arrive out of order.
 * - The server refuses saves whose base revision is stale (another tab), and
 *   then autosave stops rather than overwrite newer text.
 */
export function useAutosave(opts: {
  id: string;
  initialRevision: number | null;
  initialWritingSeconds: number;
  getSnapshot: () => Snapshot;
  onCreated: () => void;
}) {
  const { id, getSnapshot, onCreated } = opts;
  const [status, setStatus] = useState<SaveStatus>(opts.initialRevision ? "saved" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const revision = useRef(opts.initialRevision);
  const editVersion = useRef(0);
  const savedVersion = useRef(0);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const blocked = useRef(false);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  const writingMs = useRef(opts.initialWritingSeconds * 1000);
  const lastEditAt = useRef<number | null>(null);

  const schedule = useCallback((delay = DEBOUNCE_MS) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), delay);
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    while (inFlight.current) await inFlight.current;
    if (blocked.current) return false;
    if (editVersion.current === savedVersion.current) return true;

    const version = editVersion.current;
    const snap = getSnapshot();
    // Nothing typed yet: don't create an empty entry.
    if (revision.current === null && snap.empty) {
      savedVersion.current = version;
      setStatus("idle");
      return true;
    }

    setStatus("saving");
    const wasNew = revision.current === null;
    const run = (async () => {
      try {
        const res = await saveEntry({
          id,
          title: snap.title,
          content: snap.content,
          baseRevision: revision.current,
          writingSeconds: Math.floor(writingMs.current / 1000),
        });
        if (res.ok) {
          revision.current = res.revision;
          savedVersion.current = version;
          setError(null);
          setSavedAt(new Date(res.updatedAt));
          if (wasNew) onCreated();
          if (editVersion.current === version) setStatus("saved");
          else {
            setStatus("dirty");
            schedule();
          }
          return true;
        }
        setError(res.message);
        if (res.reason === "error") {
          setStatus("error");
          schedule(RETRY_MS);
        } else {
          blocked.current = true;
          setStatus("blocked");
        }
        return false;
      } catch {
        setError("Couldn't save. Check your connection.");
        setStatus("error");
        schedule(RETRY_MS);
        return false;
      }
    })();
    inFlight.current = run;
    try {
      return await run;
    } finally {
      inFlight.current = null;
    }
  }, [id, getSnapshot, onCreated, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const markDirty = useCallback(() => {
    // Active time: the gap since the previous edit, unless it was a break.
    const now = Date.now();
    const gap = lastEditAt.current === null ? 1000 : now - lastEditAt.current;
    writingMs.current += gap < IDLE_MS ? gap : 1000;
    lastEditAt.current = now;
    editVersion.current += 1;
    if (blocked.current) return;
    setStatus((s) => (s === "saving" ? s : "dirty"));
    schedule();
  }, [schedule]);

  const hasUnsaved = useCallback(
    () => editVersion.current !== savedVersion.current || inFlight.current !== null,
    [],
  );

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved()) e.preventDefault();
    };
    const online = () => void flushRef.current();
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("online", online);
      clearTimeout(timer.current);
    };
  }, [hasUnsaved]);

  return {
    status,
    error,
    savedAt,
    markDirty,
    flush,
    hasUnsaved,
    isCreated: () => revision.current !== null,
    writingSeconds: () => Math.floor(writingMs.current / 1000),
    /** Publishing bumps the revision server-side; keep ours in step. */
    setRevision: (r: number) => {
      revision.current = r;
    },
  };
}
