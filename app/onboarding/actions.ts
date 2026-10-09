"use server";

import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import type { FormState } from "@/lib/forms/state";
import { supabaseServer } from "@/lib/supabase/server";
import { interestsSchema } from "@/lib/validation/profile";

export async function completeOnboarding(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer("/onboarding");
  const parsed = interestsSchema.safeParse(fd.getAll("interests"));
  if (!parsed.success) return { error: "Please choose from the listed interests." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ interests: parsed.data, onboarded: true })
    .eq("id", viewer.id);
  if (error) return { error: "We couldn't save that. Please try again." };
  redirect(fd.get("then") === "write" ? "/write" : "/home");
}
