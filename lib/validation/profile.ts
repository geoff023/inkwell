import { z } from "zod";

export const INTERESTS = [
  { slug: "reflections", label: "Reflections" },
  { slug: "everyday-thoughts", label: "Everyday thoughts" },
  { slug: "poetry", label: "Poetry" },
  { slug: "relationships", label: "Relationships" },
  { slug: "books", label: "Books" },
  { slug: "creativity", label: "Creativity" },
  { slug: "personal-growth", label: "Personal growth" },
  { slug: "memories", label: "Memories" },
] as const;

const interestSlugs = INTERESTS.map((i) => i.slug) as [string, ...string[]];

export const interestsSchema = z.array(z.enum(interestSlugs)).max(INTERESTS.length);
