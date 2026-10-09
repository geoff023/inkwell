import { describe, expect, it } from "vitest";
import { safeNextPath, signUpSchema, usernameSchema } from "@/lib/validation/auth";
import { interestsSchema } from "@/lib/validation/profile";

describe("usernameSchema", () => {
  it("normalises case and whitespace", () => {
    expect(usernameSchema.parse("  Wren_H ")).toBe("wren_h");
  });

  it.each(["ab", "a".repeat(31), "has space", "dash-ed", "émile", "dot.ted"])("rejects %j", (name) => {
    expect(usernameSchema.safeParse(name).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = { displayName: "Wren", username: "wren", email: "Wren@Example.com", password: "longenough" };

  it("accepts a valid sign-up and lowercases the email", () => {
    expect(signUpSchema.parse(valid).email).toBe("wren@example.com");
  });

  it("rejects short passwords and blank display names", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/write/abc?x=1")).toBe("/write/abc?x=1");
  });

  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", null, 42])("falls back for %j", (next) => {
    expect(safeNextPath(next)).toBe("/home");
  });
});

describe("interestsSchema", () => {
  it("only accepts known interests", () => {
    expect(interestsSchema.safeParse(["poetry", "books"]).success).toBe(true);
    expect(interestsSchema.safeParse(["poetry", "crypto"]).success).toBe(false);
  });
});
