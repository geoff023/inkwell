"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { invalid, type FormState } from "@/lib/forms/state";
import { supabaseServer } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/profile";

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer("/settings");
  const values = {
    displayName: String(fd.get("displayName") ?? ""),
    username: String(fd.get("username") ?? ""),
    bio: String(fd.get("bio") ?? ""),
  };
  const parsed = profileSchema.safeParse({ ...values, interests: fd.getAll("interests") });
  if (!parsed.success) return invalid(parsed.error, values);
  const { displayName, username, bio, interests } = parsed.data;

  const supabase = await supabaseServer();
  if (username !== viewer.username) {
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (taken) return { fieldErrors: { username: ["That username is already taken."] }, values };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, username, bio, interests })
    .eq("id", viewer.id);
  if (error?.code === "23505") return { fieldErrors: { username: ["That username is already taken."] }, values };
  if (error) return { error: "We couldn't save your profile. Please try again.", values };

  revalidatePath("/", "layout");
  return { message: "Profile saved.", values: { ...values, username, displayName, bio: bio ?? "" } };
}

export async function deleteAccount(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireViewer("/settings");
  if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== viewer.username) {
    return { fieldErrors: { confirm: [`Type ${viewer.username} to confirm.`] } };
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "We couldn't delete your account. Please try again." };
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
