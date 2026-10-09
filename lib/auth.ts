import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

/** Verified id of the signed-in user, or null. Deduplicated per request. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** The signed-in user's own profile, or null for visitors. */
export const getViewer = cache(async () => {
  const id = await getUserId();
  if (!id) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
});

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

/** For private pages and actions: returns the viewer or sends them to log in. */
export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return viewer;
}
