import { describe, expect, it } from "vitest";
import { diff, formatDuration, signed } from "@/lib/entries/history";

const snap = (word_count: number, writing_seconds: number, title: string | null = null, char_count = word_count * 5) => ({
  title,
  word_count,
  char_count,
  writing_seconds,
});

describe("diff", () => {
  it("measures the first save from an empty start", () => {
    expect(diff(snap(500, 600), undefined)).toEqual({ words: 500, chars: 2500, seconds: 600, titleChanged: false });
  });

  it("measures words removed, time spent and title changes between saves", () => {
    expect(diff(snap(480, 900, "New"), snap(500, 600, "Old"))).toEqual({ words: -20, chars: -100, seconds: 300, titleChanged: true });
  });

  it("treats null and empty titles as the same", () => {
    expect(diff(snap(1, 0, ""), snap(1, 0, null)).titleChanged).toBe(false);
  });
});

describe("formatting", () => {
  it("signs word changes", () => {
    expect(signed(500, "word")).toBe("+500 words");
    expect(signed(-1, "word")).toBe("−1 word");
    expect(signed(0, "word")).toBe("±0 words");
    expect(signed(1200, "word")).toBe("+1,200 words");
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45 sec");
    expect(formatDuration(12 * 60)).toBe("12 min");
    expect(formatDuration(65 * 60)).toBe("1 h 5 min");
    expect(formatDuration(120 * 60)).toBe("2 h");
  });
});
