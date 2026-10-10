import data from "@/types/questionPrompts.json";

// Curated writing prompts from types/questionPrompts.json. No AI generation.
export type Prompt = { category: string; title: string };

export const PROMPTS: readonly Prompt[] = data;

export const PROMPT_CATEGORIES: readonly string[] = [...new Set(PROMPTS.map((p) => p.category))];

/** Same prompt for everyone on a given day, so the first render is stable. */
export function promptIndexFor(date: Date): number {
  const day = Math.floor(date.getTime() / 86_400_000);
  // Stride through the list so consecutive days land in different categories.
  return (day * 37) % PROMPTS.length;
}

export function promptAt(index: unknown): Prompt | undefined {
  const i = Number(index);
  return Number.isInteger(i) && i >= 0 ? PROMPTS[i] : undefined;
}

/** A random prompt index, optionally within a category, never `exclude` if avoidable. */
export function randomPromptIndex(category: string | null, exclude?: number, random = Math.random): number {
  const pool = PROMPTS.flatMap((p, i) => (!category || p.category === category) && i !== exclude ? [i] : []);
  if (pool.length === 0) return exclude ?? 0;
  return pool[Math.floor(random() * pool.length)];
}
