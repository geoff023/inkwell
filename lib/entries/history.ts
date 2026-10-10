// Pure helpers for the save-history panel.

export type Snapshot = { title: string | null; word_count: number; char_count: number; writing_seconds: number };

export type Change = { words: number; chars: number; seconds: number; titleChanged: boolean };

/** Difference between a checkpoint and the one before it (or an empty start). */
export function diff(current: Snapshot, previous: Snapshot | undefined): Change {
  const prev = previous ?? { title: null, word_count: 0, char_count: 0, writing_seconds: 0 };
  return {
    words: current.word_count - prev.word_count,
    chars: current.char_count - prev.char_count,
    seconds: Math.max(0, current.writing_seconds - prev.writing_seconds),
    titleChanged: previous !== undefined && (current.title ?? "") !== (prev.title ?? ""),
  };
}

export function signed(n: number, unit: string): string {
  const abs = Math.abs(n);
  const label = `${abs.toLocaleString("en")} ${abs === 1 ? unit : `${unit}s`}`;
  return n > 0 ? `+${label}` : n < 0 ? `−${label}` : `±0 ${unit}s`;
}

/** "45 sec", "12 min", "1 h 5 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
