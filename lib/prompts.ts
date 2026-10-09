// Small curated set of gentle prompts. No AI generation in the MVP.
export const PROMPTS = [
  "What has stayed on your mind today?",
  "What is something you wish you had written down?",
  "What ordinary moment felt meaningful recently?",
  "What do you want to remember about today?",
  "Who did you think about this week, and why?",
  "What is a small thing that made you feel at home?",
  "What would you tell yourself from a year ago?",
  "Describe a place you return to in your mind.",
] as const;

/** Same prompt for everyone on a given day, so it doesn't flicker between visits. */
export function promptIndexFor(date: Date): number {
  const day = Math.floor(date.getTime() / 86_400_000);
  return day % PROMPTS.length;
}

export function promptAt(index: unknown): string | undefined {
  const i = Number(index);
  return Number.isInteger(i) ? PROMPTS[i] : undefined;
}
