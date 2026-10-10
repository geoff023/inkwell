import { describe, expect, it } from "vitest";
import { PROMPT_CATEGORIES, PROMPTS, promptAt, promptIndexFor, randomPromptIndex } from "@/lib/prompts";

describe("prompts", () => {
  it("loads every prompt with a known category and a unique title", () => {
    expect(PROMPTS.length).toBeGreaterThan(400);
    expect(PROMPT_CATEGORIES).toHaveLength(12);
    expect(new Set(PROMPTS.map((p) => p.title.toLowerCase())).size).toBe(PROMPTS.length);
  });

  it("draws within the chosen category and avoids repeating the current prompt", () => {
    const category = PROMPT_CATEGORIES[3];
    for (let i = 0; i < 50; i++) {
      const current = randomPromptIndex(category);
      const next = randomPromptIndex(category, current);
      expect(PROMPTS[next].category).toBe(category);
      expect(next).not.toBe(current);
    }
  });

  it("gives a stable daily prompt and validates indexes from the URL", () => {
    const day = new Date("2026-10-10T08:00:00Z");
    expect(promptIndexFor(day)).toBe(promptIndexFor(new Date("2026-10-10T20:00:00Z")));
    expect(promptAt(String(promptIndexFor(day)))).toBeDefined();
    expect(promptAt("-1")).toBeUndefined();
    expect(promptAt("abc")).toBeUndefined();
    expect(promptAt(PROMPTS.length)).toBeUndefined();
  });
});
